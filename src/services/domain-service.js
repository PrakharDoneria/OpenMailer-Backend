const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const env = require("../config/env");

class DomainService {
  constructor(workspaceRepository) {
    this.workspaces = workspaceRepository;
  }

  async addDomain(workspaceId, domain) {
    const workspace = await this.workspaces.get(workspaceId);
    if (!workspace) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });
    const token = crypto.createHmac("sha256", env.DNS_VERIFICATION_TOKEN_SECRET).update(`${workspaceId}:${domain}`).digest("hex");
    await this.workspaces.update(workspaceId, { custom_domain: domain, status: "pending_verification" });
    return {
      domain,
      verification: { type: "TXT", name: `_openmailer.${domain}`, value: token },
      mx: { name: domain, values: ["mx1.openmailer.example", "mx2.openmailer.example"] },
      dkim: { type: "CNAME", name: `openmailer._domainkey.${domain}`, value: "dkim.openmailer.example" }
    };
  }

  async verify(workspaceId) {
    const workspace = await this.workspaces.get(workspaceId);
    if (!workspace) throw Object.assign(new Error("Workspace not found"), { statusCode: 404 });
    const verified = Boolean(workspace.custom_domain);
    if (!verified) throw Object.assign(new Error("No domain is configured"), { statusCode: 409 });
    const token = crypto.createHmac("sha256", env.DNS_VERIFICATION_TOKEN_SECRET).update(`${workspaceId}:${workspace.custom_domain}`).digest("hex");
    let records;
    try {
      records = await dns.resolveTxt(`_openmailer.${workspace.custom_domain}`);
    } catch (error) {
      throw Object.assign(new Error("Domain verification TXT record was not found"), { statusCode: 409, cause: error });
    }
    if (!records.some((record) => record.join("") === token)) {
      throw Object.assign(new Error("Domain verification TXT record does not match"), { statusCode: 409 });
    }
    await this.workspaces.update(workspaceId, { status: "active" });
    return { verified: true, status: "active" };
  }
}

module.exports = { DomainService };
