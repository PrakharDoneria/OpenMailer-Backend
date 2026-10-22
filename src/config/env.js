const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(9000),
  LOG_LEVEL: z.string().default("info"),
  CATALYST_WORKSPACE_TABLE: z.string().default("Workspaces"),
  CATALYST_MAILBOX_TABLE: z.string().default("Mailboxes"),
  CATALYST_MESSAGE_TABLE: z.string().default("Messages"),
  CATALYST_PROJECT_ID: z.string().optional(),
  CATALYST_ACCESS_TOKEN: z.string().min(1).optional(),
  CATALYST_RAW_MAIL_FOLDER_ID: z.string().min(1).optional(),
  CATALYST_RAW_MAIL_FOLDER_NAME: z.string().default("openmailer-raw-mails"),
  DNS_VERIFICATION_TOKEN_SECRET: z.string().min(16),
  INBOUND_WEBHOOK_SECRET: z.string().min(16),
  MAX_RAW_MAIL_BYTES: z.coerce.number().int().positive().default(10485760)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

module.exports = parsed.data;
