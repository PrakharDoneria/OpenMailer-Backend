const schema = {
  Workspaces: {
    row_id: "string (auto-generated)",
    workspace_name: "string",
    custom_domain: "string (unique)",
    status: "string: pending_verification|active|suspended",
    owner_email: "string",
    created_at: "timestamp"
  },
  Mailboxes: {
    row_id: "string (auto-generated)",
    workspace_id: "string (reference: Workspaces)",
    email_address: "string (unique)",
    password_hash: "string",
    is_active: "boolean",
    created_at: "timestamp"
  },
  Messages: {
    row_id: "string (auto-generated)",
    mailbox_id: "string (reference: Mailboxes)",
    sender: "string",
    recipient: "string",
    subject: "string",
    body_snippet: "string",
    storage_url: "string",
    is_read: "boolean",
    timestamp: "timestamp"
  }
};

console.log("Create these Catalyst Data Store tables in the Catalyst console:");
console.log(JSON.stringify(schema, null, 2));
console.log("Catalyst Data Store does not expose portable table DDL through the Node SDK; this script is an auditable schema initializer/documentation check.");
