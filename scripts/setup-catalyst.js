const schemas = require("./init-schema");

const region = process.env.CATALYST_REGION || "in";
const projectId = process.env.CATALYST_PROJECT_ID;
const accessToken = process.env.CATALYST_ACCESS_TOKEN;
const apiBase = process.env.CATALYST_API_BASE_URL || `https://api.catalyst.zoho.${region}`;

if (!projectId || !accessToken) {
  throw new Error("CATALYST_PROJECT_ID and CATALYST_ACCESS_TOKEN are required for Catalyst resource setup.");
}

const tableDefinitions = [
  { name: process.env.CATALYST_WORKSPACE_TABLE || "Workspaces", columns: schemas.Workspaces },
  { name: process.env.CATALYST_MAILBOX_TABLE || "Mailboxes", columns: schemas.Mailboxes },
  { name: process.env.CATALYST_MESSAGE_TABLE || "Messages", columns: schemas.Messages }
];

function columnType(description) {
  if (description.includes("boolean")) return "BOOLEAN";
  if (description.includes("timestamp")) return "DATETIME";
  return "VARCHAR";
}

async function catalystRequest(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  let parsed;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    parsed = { raw: body };
  }
  if (!response.ok && response.status !== 409) {
    throw new Error(`Catalyst API ${response.status} ${response.statusText}: ${body}`);
  }
  return { status: response.status, body: parsed };
}

async function createTable(table) {
  const columns = Object.entries(table.columns)
    .filter(([name]) => name !== "row_id")
    .map(([name, description]) => ({
      column_name: name,
      data_type: columnType(description),
      is_mandatory: false
    }));
  const result = await catalystRequest(`/baas/v1/project/${projectId}/datastore/tables`, {
    method: "POST",
    body: JSON.stringify({ table_name: table.name, columns })
  });
  console.log(`${result.status === 409 ? "Exists" : "Created"} Data Store table: ${table.name}`);
}

async function createFolder() {
  const folderName = process.env.CATALYST_RAW_MAIL_FOLDER_NAME || "openmailer-raw-mails";
  const result = await catalystRequest(`/baas/v1/project/${projectId}/filestore/folder`, {
    method: "POST",
    body: JSON.stringify({ folder_name: folderName })
  });
  const folderId = result.body.folder_id || result.body.id || result.body.folder?.id;
  if (folderId) console.log(`Filestore folder ready: ${folderName} (${folderId})`);
  else console.log(`${result.status === 409 ? "Exists" : "Created"} Filestore folder: ${folderName}`);
  if (folderId) console.log(`Set CATALYST_RAW_MAIL_FOLDER_ID=${folderId} in the AppSail environment.`);
}

async function main() {
  for (const table of tableDefinitions) await createTable(table);
  await createFolder();
  console.log("Catalyst resource setup completed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
