# OpenMailer API Reference

OpenMailer is a multi-tenant workspace mail service running on Zoho Catalyst AppSail.

## Base URL

Development AppSail:

```text
https://openmailer-backend-50047080675.development.catalystappsail.in
```

Replace the base URL with the URL printed by `deploy.sh` after deployment.

## Authentication

All endpoints require an API key:

```http
Authorization: Bearer <API_KEY>
```

JSON endpoints additionally require:

```http
Content-Type: application/json
```

The inbound webhook requires both the API key and the configured webhook secret:

```http
X-Inbound-Webhook-Secret: <INBOUND_WEBHOOK_SECRET>
```

## Common response format

Successful responses use a `data` property. Errors use:

```json
{
  "error": {
    "code": "REQUEST_ERROR",
    "message": "Human-readable explanation"
  }
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `201` | Resource or message created |
| `202` | Mail accepted for delivery |
| `401` | Invalid or missing credentials |
| `404` | Resource or route not found |
| `409` | Duplicate resource, verification conflict, or mailbox limit |
| `422` | Request validation failed |
| `500` | Unexpected server error |

## Public Catalyst initialization

### Initialize required Catalyst resources

`POST /init-tables`

This route is intentionally unauthenticated so a newly deployed AppSail service can initialize itself. It is still protected by the global rate limiter. The AppSail environment must contain `CATALYST_PROJECT_ID` and `CATALYST_ACCESS_TOKEN`.

Headers:

```http
Content-Type: application/json
```

No request body is required. Existing tables and the Filestore folder are treated as already initialized.

Response `200`:

```json
{
  "data": {
    "initialized": true,
    "resources": [
      {
        "resource": "table",
        "name": "Workspaces",
        "status": "created"
      },
      {
        "resource": "table",
        "name": "Mailboxes",
        "status": "exists"
      },
      {
        "resource": "table",
        "name": "Messages",
        "status": "created"
      },
      {
        "resource": "filestore_folder",
        "name": "openmailer-raw-mails",
        "status": "created",
        "folder_id": "folder-id"
      }
    ]
  }
}
```

If the Filestore folder is newly created, copy its `folder_id` to `CATALYST_RAW_MAIL_FOLDER_ID` in the AppSail environment. The endpoint should be disabled or protected after first-time provisioning in a production hardening pass because it is intentionally public.

## Workspaces

### Register a workspace

`POST /api/v1/workspaces`

Headers:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Request:

```json
{
  "workspace_name": "Acme",
  "custom_domain": "acme.example",
  "owner_email": "owner@acme.example"
}
```

Validation:

- `workspace_name`: 2-120 characters
- `custom_domain`: 3-253 characters
- `owner_email`: valid email address
- `custom_domain` must not already be registered

Response `201`:

```json
{
  "data": {
    "id": "workspace-row-id",
    "workspace_name": "Acme",
    "custom_domain": "acme.example",
    "owner_email": "owner@acme.example",
    "status": "pending_verification"
  }
}
```

### Add a custom domain

`POST /api/v1/workspaces/:id/domains`

Headers:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Request:

```json
{
  "domain": "acme.example"
}
```

Response `201`:

```json
{
  "data": {
    "domain": "acme.example",
    "verification": {
      "type": "TXT",
      "name": "_openmailer.acme.example",
      "value": "generated-verification-token"
    },
    "mx": {
      "name": "acme.example",
      "values": [
        "mx1.openmailer.example",
        "mx2.openmailer.example"
      ]
    },
    "dkim": {
      "type": "CNAME",
      "name": "openmailer._domainkey.acme.example",
      "value": "dkim.openmailer.example"
    }
  }
}
```

Add the returned DNS records before calling domain verification.

### Verify a custom domain

`POST /api/v1/workspaces/:id/domains/verify`

Headers:

```http
Authorization: Bearer <API_KEY>
```

No request body is required. The service resolves `_openmailer.<domain>` and compares its TXT value with the generated verification token.

Response `200`:

```json
{
  "data": {
    "verified": true,
    "status": "active"
  }
}
```

If the TXT record is missing or does not match, the endpoint returns `409`.

## Mailboxes

### Create a mailbox

`POST /api/v1/workspaces/:id/mailboxes`

Headers:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Request:

```json
{
  "email_address": "alice@acme.example",
  "password": "a-long-password-at-least-12"
}
```

Validation and behavior:

- Password must be 12-128 characters.
- The email address must use the workspace domain.
- Passwords are stored as bcrypt hashes.
- Each workspace may create up to five free mailboxes.
- Password hashes are never returned.

Response `201`:

```json
{
  "data": {
    "id": "mailbox-row-id",
    "email_address": "alice@acme.example",
    "is_active": true,
    "created_at": "2026-10-22T10:00:00.000Z"
  }
}
```

### List workspace mailboxes

`GET /api/v1/workspaces/:id/mailboxes`

Headers:

```http
Authorization: Bearer <API_KEY>
```

Response `200`:

```json
{
  "data": [
    {
      "ROWID": "mailbox-row-id",
      "workspace_id": "workspace-row-id",
      "email_address": "alice@acme.example",
      "is_active": true,
      "created_at": "2026-10-22T10:00:00.000Z"
    }
  ]
}
```

Password hashes are excluded from this response.

## Mail delivery

### Send an outbound email

`POST /api/v1/mail/send`

Headers:

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

Request:

```json
{
  "sender": "alice@acme.example",
  "recipient": "bob@example.net",
  "subject": "Hello",
  "text": "Message body"
}
```

HTML content can be sent instead of, or alongside, text:

```json
{
  "sender": "alice@acme.example",
  "recipient": "bob@example.net",
  "subject": "Hello",
  "text": "Plain-text fallback",
  "html": "<p>Message body</p>"
}
```

Validation:

- `sender` and `recipient` must be valid email addresses.
- `subject` is limited to 998 characters.
- `text` is limited to 100,000 characters.
- `html` is limited to 500,000 characters.
- At least one of `text` or `html` is required.
- The sender must be an active OpenMailer mailbox.

Response `202`:

```json
{
  "data": {
    "accepted": true,
    "sender": "alice@acme.example",
    "recipient": "bob@example.net",
    "subject": "Hello"
  }
}
```

Delivery uses Catalyst's native Mail component, `app.mail().sendMail()`. The sender must also be configured and verified as an allowed sender in the Catalyst console.

### Receive an inbound email

`POST /api/v1/mail/inbound-webhook`

Send the raw RFC 822 message as the request body.

Headers:

```http
Authorization: Bearer <API_KEY>
X-Inbound-Webhook-Secret: <INBOUND_WEBHOOK_SECRET>
Content-Type: message/rfc822
```

`application/octet-stream` is also accepted. The maximum payload is controlled by `MAX_RAW_MAIL_BYTES`.

Example raw message:

```text
From: sender@example.net
To: alice@acme.example
Subject: Hello
Date: Wed, 22 Oct 2026 10:00:00 +0000
Content-Type: text/plain; charset=utf-8

Message body
```

The service parses the message, verifies the recipient mailbox, stores the raw `.eml` payload in Catalyst Filestore, and indexes the message in Catalyst Data Store.

Response `201`:

```json
{
  "data": {
    "ROWID": "message-row-id",
    "mailbox_id": "mailbox-row-id",
    "sender": "sender@example.net",
    "recipient": "alice@acme.example",
    "subject": "Hello",
    "body_snippet": "Message body",
    "storage_url": "catalyst-storage-url",
    "is_read": false,
    "timestamp": "2026-10-22T10:00:00.000Z"
  }
}
```

## Inbox

### List mailbox messages

`GET /api/v1/mailboxes/:mail_id/messages`

Headers:

```http
Authorization: Bearer <API_KEY>
```

Query parameters:

| Parameter | Required | Default | Limits |
| --- | --- | --- | --- |
| `page` | No | `1` | Minimum `1` |
| `limit` | No | `25` | Minimum `1`, maximum `100` |

Example:

```http
GET /api/v1/mailboxes/mailbox-row-id/messages?page=1&limit=25
Authorization: Bearer <API_KEY>
```

Response `200`:

```json
{
  "data": [
    {
      "ROWID": "message-row-id",
      "mailbox_id": "mailbox-row-id",
      "sender": "sender@example.net",
      "recipient": "alice@acme.example",
      "subject": "Hello",
      "body_snippet": "Message body",
      "storage_url": "catalyst-storage-url",
      "is_read": false,
      "timestamp": "2026-10-22T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "pages": 1
  }
}
```
