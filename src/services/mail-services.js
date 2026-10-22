const bcrypt = require("bcryptjs");
const { simpleParser } = require("mailparser");

class WorkspaceService {
  constructor({ workspaces, mailboxes }) {
    this.workspaces = workspaces;
    this.mailboxes = mailboxes;
  }

  async create({ workspaceName, customDomain, ownerEmail }) {
    if (await this.workspaces.findByDomain(customDomain)) throw Object.assign(new Error("Domain already registered"), { statusCode: 409 });
    return this.workspaces.insert({
      workspace_name: workspaceName, custom_domain: customDomain, owner_email: ownerEmail,
      status: "pending_verification", created_at: new Date().toISOString()
    });
  }

  async createMailbox(workspaceId, emailAddress, password) {
    const workspace = await this.workspaces.get(workspaceId);
    if (!workspace) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });
    const mailboxes = await this.mailboxes.findByWorkspace(workspaceId);
    if (mailboxes.length >= 5) throw Object.assign(new Error("Free mailbox limit of 5 reached"), { statusCode: 409 });
    if (!emailAddress.endsWith(`@${workspace.custom_domain}`)) throw Object.assign(new Error("Mailbox must use the workspace domain"), { statusCode: 422 });
    if (await this.mailboxes.findByEmail(emailAddress)) throw Object.assign(new Error("Mailbox already exists"), { statusCode: 409 });
    return this.mailboxes.insert({
      workspace_id: workspaceId, email_address: emailAddress, password_hash: await bcrypt.hash(password, 12),
      is_active: true, created_at: new Date().toISOString()
    });
  }
}

class MailService {
  constructor({ workspaces, mailboxes, messages, rawMailStorage, mailClient, logger }) {
    Object.assign(this, { workspaces, mailboxes, messages, rawMailStorage, mailClient, logger });
  }

  async send({ sender, recipient, subject, text, html }) {
    const mailbox = await this.mailboxes.findByEmail(sender);
    if (!mailbox || !mailbox.is_active) throw Object.assign(new Error("Sender mailbox is not active"), { statusCode: 403 });
    await this.mailClient.sendMail({
      from_email: sender,
      to_email: [recipient],
      subject,
      content: html || text
    });
    return { accepted: true, sender, recipient, subject };
  }

  async ingest(rawMail) {
    const parsed = await simpleParser(rawMail);
    const recipient = parsed.to?.value?.[0]?.address;
    if (!recipient) throw Object.assign(new Error("Inbound message has no recipient"), { statusCode: 422 });
    const mailbox = await this.mailboxes.findByEmail(recipient);
    if (!mailbox || !mailbox.is_active) throw Object.assign(new Error("Recipient mailbox not found"), { statusCode: 404 });
    const storageUrl = await this.rawMailStorage.store(rawMail);
    return this.messages.insert({
      mailbox_id: mailbox.ROWID || mailbox.row_id, sender: parsed.from?.value?.[0]?.address || "",
      recipient, subject: parsed.subject || "", body_snippet: (parsed.text || "").slice(0, 500),
      storage_url: storageUrl, is_read: false, timestamp: new Date().toISOString()
    });
  }

  async listMessages(mailboxId, page, limit) {
    if (!(await this.mailboxes.get(mailboxId))) throw Object.assign(new Error("Mailbox not found"), { statusCode: 404 });
    return this.messages.findByMailbox(mailboxId, page, limit);
  }
}

module.exports = { WorkspaceService, MailService };
