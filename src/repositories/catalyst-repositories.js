const env = require("../config/env");

class CatalystRepository {
  constructor(app, tableName) {
    this.table = app.datastore().table(tableName);
  }

  async insert(row) {
    return this.table.insertRow(row);
  }

  async get(rowId) {
    return this.table.getRow(rowId);
  }

  async all() {
    return this.table.getAllRows();
  }

  async update(rowId, row) {
    return this.table.updateRow({ ...row, ROWID: rowId });
  }
}

class WorkspaceRepository extends CatalystRepository {
  constructor(app) { super(app, env.CATALYST_WORKSPACE_TABLE); }
  async findByDomain(domain) { return (await this.all()).find((row) => row.custom_domain === domain); }
}

class MailboxRepository extends CatalystRepository {
  constructor(app) { super(app, env.CATALYST_MAILBOX_TABLE); }
  async findByEmail(email) { return (await this.all()).find((row) => row.email_address === email); }
  async findByWorkspace(workspaceId) { return (await this.all()).filter((row) => row.workspace_id === workspaceId); }
}

class MessageRepository extends CatalystRepository {
  constructor(app) { super(app, env.CATALYST_MESSAGE_TABLE); }
  async findByMailbox(mailboxId, page, limit) {
    const rows = (await this.all())
      .filter((row) => row.mailbox_id === mailboxId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const start = (page - 1) * limit;
    return { rows: rows.slice(start, start + limit), total: rows.length };
  }
}

module.exports = { WorkspaceRepository, MailboxRepository, MessageRepository };
