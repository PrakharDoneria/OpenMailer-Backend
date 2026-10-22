const logger = require("./logger");
const { getCatalystApp } = require("./catalyst");
const { WorkspaceRepository, MailboxRepository, MessageRepository } = require("../repositories/catalyst-repositories");
const { CatalystRawMailStorage } = require("../repositories/raw-mail-storage");
const { WorkspaceService, MailService } = require("../services/mail-services");
const { DomainService } = require("../services/domain-service");

function createDependencies(req) {
  const app = getCatalystApp(req);
  const repositories = {
    workspaces: new WorkspaceRepository(app),
    mailboxes: new MailboxRepository(app),
    messages: new MessageRepository(app)
  };
  const rawMailStorage = new CatalystRawMailStorage(app);
  const mailClient = app.mail();

  return {
    workspaceService: new WorkspaceService(repositories),
    domainService: new DomainService(repositories.workspaces),
    mailService: new MailService({ ...repositories, rawMailStorage, mailClient, logger })
  };
}

module.exports = { createDependencies };
