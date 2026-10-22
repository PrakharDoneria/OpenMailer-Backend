const crypto = require("node:crypto");
const env = require("../config/env");

class CatalystRawMailStorage {
  constructor(app) {
    this.folder = app.filestore().folder(env.CATALYST_RAW_MAIL_FOLDER_ID);
  }

  async store(rawMail) {
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}.eml`;
    const uploaded = await this.folder.uploadFile({ code: rawMail, name });
    return uploaded.file_url || uploaded.fileUrl || uploaded.url || name;
  }
}

module.exports = { CatalystRawMailStorage };
