const { createDependencies } = require("../config/dependencies");

function services(req) {
  if (!req.services) req.services = createDependencies(req);
  return req.services;
}

async function registerWorkspace(req, res) {
  const row = await services(req).workspaceService.create({ workspaceName: req.body.workspace_name, customDomain: req.body.custom_domain, ownerEmail: req.body.owner_email });
  res.status(201).json({ data: { id: row.ROWID || row.row_id, ...req.body, status: row.status } });
}

async function addDomain(req, res) {
  res.status(201).json({ data: await services(req).domainService.addDomain(req.params.id, req.body.domain) });
}

async function verifyDomain(req, res) {
  res.json({ data: await services(req).domainService.verify(req.params.id) });
}

async function createMailbox(req, res) {
  const row = await services(req).workspaceService.createMailbox(req.params.id, req.body.email_address, req.body.password);
  res.status(201).json({ data: { id: row.ROWID || row.row_id, email_address: row.email_address, is_active: row.is_active, created_at: row.created_at } });
}

async function listMailboxes(req, res) {
  const rows = await services(req).workspaceService.mailboxes.findByWorkspace(req.params.id);
  res.json({ data: rows.map(({ password_hash: _password, ...mailbox }) => mailbox) });
}

async function sendMail(req, res) {
  res.status(202).json({ data: await services(req).mailService.send(req.body) });
}

async function inboundWebhook(req, res) {
  res.status(201).json({ data: await services(req).mailService.ingest(req.body) });
}

async function listMessages(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "25", 10)));
  const result = await services(req).mailService.listMessages(req.params.mail_id, page, limit);
  res.json({ data: result.rows, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
}

module.exports = { registerWorkspace, addDomain, verifyDomain, createMailbox, listMailboxes, sendMail, inboundWebhook, listMessages };
