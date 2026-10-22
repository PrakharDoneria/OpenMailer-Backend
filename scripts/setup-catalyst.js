const schemas = require("./init-schema");

function columnType(description) {
  if (description.includes("boolean")) return "BOOLEAN";
  if (description.includes("timestamp")) return "DATETIME";
  return "VARCHAR";
}

function getSetupConfig() {
  const region = process.env.CATALYST_REGION || "in";
  const projectId = process.env.CATALYST_PROJECT_ID;
  const accessToken = process.env.CATALYST_ACCESS_TOKEN;
  if (!projectId || !accessToken) {
    throw Object.assign(
      new Error("Catalyst provisioning is not configured. Set CATALYST_PROJECT_ID and CATALYST_ACCESS_TOKEN in the AppSail environment."),
      { statusCode: 503 }
    );
  }
  return {
    projectId,
    accessToken,
    apiBase: process.env.CATALYST_API_BASE_URL || `https://api.catalyst.zoho.${region}`,
    tables: [
      { name: process.env.CATALYST_WORKSPACE_TABLE || "Workspaces", columns: schemas.Workspaces },
      { name: process.env.CATALYST_MAILBOX_TABLE || "Mailboxes", columns: schemas.Mailboxes },
      { name: process.env.CATALYST_MESSAGE_TABLE || "Messages", columns: schemas.Messages }
    ],
    folderName: process.env.CATALYST_RAW_MAIL_FOLDER_NAME || "openmailer-raw-mails"
  };
}

async function catalystRequest(config, path, options = {}) {
  let response;
  try {
    response = await fetch(`${config.apiBase}${path}`, {
      ...options,
      headers: {
        Authorization: `Zoho-oauthtoken ${config.accessToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw Object.assign(new Error("Unable to connect to the Catalyst provisioning API."), { statusCode: 503, cause: error });
  }
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    parsed = { raw: body };
  }
  if (!response.ok && response.status !== 409) {
    const error = new Error(`Catalyst provisioning failed with HTTP ${response.status}. Check the project, region, token scopes, and resource API configuration.`);
    error.statusCode = response.status === 401 || response.status === 403 ? 503 : 502;
    error.cause = { status: response.status, body };
    throw error;
  }
  return { status: response.status, body: parsed };
}

async function createTable(config, table) {
  const columns = Object.entries(table.columns)
    .filter(([name]) => name !== "row_id")
    .map(([name, description]) => ({
      column_name: name,
      data_type: columnType(description),
      is_mandatory: false
    }));
  const result = await catalystRequest(config, `/baas/v1/project/${config.projectId}/datastore/tables`, {
    method: "POST",
    body: JSON.stringify({ table_name: table.name, columns })
  });
  return { resource: "table", name: table.name, status: result.status === 409 ? "exists" : "created" };
}

async function createFolder(config) {
  const result = await catalystRequest(config, `/baas/v1/project/${config.projectId}/filestore/folder`, {
    method: "POST",
    body: JSON.stringify({ folder_name: config.folderName })
  });
  const folderId = result.body.folder_id || result.body.id || result.body.folder?.id;
  return {
    resource: "filestore_folder",
    name: config.folderName,
    status: result.status === 409 ? "exists" : "created",
    folder_id: folderId || null
  };
}

async function provisionResources() {
  const config = getSetupConfig();
  const resources = [];
  for (const table of config.tables) resources.push(await createTable(config, table));
  resources.push(await createFolder(config));
  return resources;
}

if (require.main === module) {
  provisionResources()
    .then((resources) => {
      resources.forEach((resource) => console.log(`${resource.status === "exists" ? "Exists" : "Created"} ${resource.resource}: ${resource.name}`));
      const folder = resources.find((resource) => resource.resource === "filestore_folder");
      if (folder?.folder_id) console.log(`Set CATALYST_RAW_MAIL_FOLDER_ID=${folder.folder_id} in the AppSail environment.`);
      console.log("Catalyst resource setup completed.");
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { provisionResources };
