# OpenMailer

OpenMailer is a modular, multi-tenant workspace mail backend built with Node.js, Express, and Zoho Catalyst. It provides custom-domain workspaces, DNS verification, mailbox provisioning, Catalyst-native outbound email, inbound raw-mail ingestion, and mailbox message indexing.

## Features

- Multi-tenant workspace registration
- Custom-domain DNS verification
- TXT verification, MX, and DKIM CNAME targets
- Up to five free mailboxes per workspace
- Bcrypt password hashing
- Catalyst native Mail API for outbound delivery
- RFC 822 inbound webhook parsing
- Raw `.eml` storage in Catalyst Filestore
- Message indexing and paginated inbox retrieval
- Catalyst Data Store repositories
- API key and inbound webhook authentication
- Zod request validation
- Helmet, CORS, rate limiting, and structured logging
- Catalyst AppSail deployment script

## Requirements

- Node.js 20 or later
- npm
- A Zoho Catalyst project
- Catalyst CLI
- Catalyst CLI authentication
- Catalyst Data Store tables
- Catalyst Filestore folder for raw mail

## Project structure

```text
.
├── src/
│   ├── config/          Catalyst SDK, environment, and dependency wiring
│   ├── controllers/     HTTP request handlers
│   ├── middlewares/     Authentication, validation, and error handling
│   ├── repositories/    Catalyst Data Store and Filestore access
│   ├── routes/          Express routes
│   ├── services/        Workspace, domain, and mail business logic
│   └── server.js        Express/AppSail entrypoint
├── scripts/
│   ├── init-schema.js   Catalyst table schema reference
│   └── setup-catalyst.js Catalyst resource provisioning
├── API.md               Complete endpoint reference
├── app-config.json      AppSail runtime configuration
├── catalyst.json        Catalyst AppSail resource configuration
├── deploy.sh            Authenticated AppSail deployment script
├── package.json
└── .env.example
```

## Catalyst setup

Create the following Catalyst Data Store tables. The schema is also printed by `npm run schema:init`.

### Workspaces

| Column | Type |
| --- | --- |
| `row_id` | Auto-generated/string |
| `workspace_name` | String |
| `custom_domain` | String, unique |
| `status` | `pending_verification`, `active`, or `suspended` |
| `owner_email` | String |
| `created_at` | Timestamp |

### Mailboxes

| Column | Type |
| --- | --- |
| `row_id` | Auto-generated/string |
| `workspace_id` | String reference to Workspaces |
| `email_address` | String, unique |
| `password_hash` | String |
| `is_active` | Boolean |
| `created_at` | Timestamp |

### Messages

| Column | Type |
| --- | --- |
| `row_id` | Auto-generated/string |
| `mailbox_id` | String reference to Mailboxes |
| `sender` | String |
| `recipient` | String |
| `subject` | String |
| `body_snippet` | String |
| `storage_url` | String |
| `is_read` | Boolean |
| `timestamp` | Timestamp |

Create a Catalyst Filestore folder and place its ID in `CATALYST_RAW_MAIL_FOLDER_ID`.

### Provision resources automatically

The repository includes `setup.sh`, which creates the three Data Store tables and the raw-mail Filestore folder through the Catalyst project APIs. It is intentionally separate from deployment and requires an explicit OAuth access token.

From Git Bash or WSL:

```bash
export CATALYST_PROJECT_ID="your-project-id"
export CATALYST_ACCESS_TOKEN="your-oauth-access-token"
./setup.sh
```

From PowerShell, set the variables before invoking Git Bash:

```powershell
$env:CATALYST_PROJECT_ID = "your-project-id"
$env:CATALYST_ACCESS_TOKEN = "your-oauth-access-token"
bash .\setup.sh
```

The script is idempotent for resources that already exist: a Catalyst `409 Conflict` is reported as `Exists` rather than treated as a failure. It prints the newly created Filestore folder ID; copy that value to `CATALYST_RAW_MAIL_FOLDER_ID` in the AppSail environment. Keep the OAuth token out of `.env`, source control, and deployment logs.

For outbound mail, configure and verify permitted sender addresses in the Catalyst console. OpenMailer calls Catalyst's native `app.mail().sendMail()` API; it does not use a generic SMTP provider.

## Configuration

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Set every required value in `.env`:

```dotenv
NODE_ENV=development
PORT=9000
LOG_LEVEL=info
API_KEY=replace-with-a-long-random-secret
CATALYST_WORKSPACE_TABLE=Workspaces
CATALYST_MAILBOX_TABLE=Mailboxes
CATALYST_MESSAGE_TABLE=Messages
CATALYST_RAW_MAIL_FOLDER_ID=your-filestore-folder-id
DNS_VERIFICATION_TOKEN_SECRET=replace-with-a-long-random-secret
INBOUND_WEBHOOK_SECRET=replace-with-a-long-random-secret
MAX_RAW_MAIL_BYTES=10485760
```

`API_KEY`, `CATALYST_RAW_MAIL_FOLDER_ID`, `DNS_VERIFICATION_TOKEN_SECRET`, and `INBOUND_WEBHOOK_SECRET` are required. Use long random values for secrets and never commit `.env`.

`CATALYST_PROJECT_ID` and `CATALYST_ACCESS_TOKEN` are required by the public `/init-tables` provisioning endpoint and by `setup.sh`. Keep the OAuth access token only in the private AppSail environment; never expose it to clients or commit it. The token must have Catalyst project, Data Store, and Filestore management scopes. A missing token returns `503 SERVICE_CONFIGURATION_ERROR`.

All origins are currently allowed by CORS (`Access-Control-Allow-Origin: *`) so browser clients can call the service from any website. API key and webhook-secret authentication still apply to the `/api/v1` routes.

## Install and run locally

```powershell
npm install
npm run check
npm run schema:init
npm start
```

The service listens on `http://localhost:9000` by default.

For development with Node's watch mode:

```powershell
npm run dev
```

## Deploy to Catalyst AppSail

Install and authenticate the Catalyst CLI:

```powershell
npm install --global zcatalyst-cli
catalyst login
catalyst whoami
```

From PowerShell, use Git Bash:

```powershell
cd D:\Projects\OpenMailer
bash .\deploy.sh
```

Or use WSL:

```powershell
wsl bash -lc "cd /mnt/d/Projects/OpenMailer && ./deploy.sh"
```

The script checks the CLI and authentication, installs dependencies, runs lint checks, deploys the configured `openmailer-backend` AppSail service, and prints the deployment URL when Catalyst returns one.

The AppSail runtime is configured in [app-config.json](./app-config.json):

- Stack: `node20`
- Build path: `.`
- Startup command: `npm start`
- Memory: `256 MB`

## Typical setup flow

1. Create and configure the Catalyst project.
2. Configure `CATALYST_PROJECT_ID` and `CATALYST_ACCESS_TOKEN` in the AppSail environment.
3. Deploy with `deploy.sh`.
4. Call `POST /init-tables` once to create the Data Store tables and Filestore folder.
5. Copy the returned Filestore folder ID to `CATALYST_RAW_MAIL_FOLDER_ID` and redeploy/restart.
6. Register a workspace using `POST /api/v1/workspaces`.
7. Add the returned TXT, MX, and DKIM DNS records.
8. Verify the domain.
9. Provision mailboxes.
10. Configure inbound mail routing to `/api/v1/mail/inbound-webhook`.
11. Send and retrieve mail using the endpoints in [API.md](./API.md).

## Validation and security notes

- API keys must be sent over HTTPS.
- Inbound webhook requests require a second secret header.
- Mailbox passwords are hashed and never returned.
- Raw inbound messages are size-limited.
- Request bodies are validated before business logic executes.
- Do not log API keys, webhook secrets, mailbox passwords, or raw message contents.
- Catalyst sender verification is separate from custom-domain DNS verification.

## API documentation

See [API.md](./API.md) for all implemented endpoints, headers, request payloads, query parameters, response structures, validation rules, and error statuses.
