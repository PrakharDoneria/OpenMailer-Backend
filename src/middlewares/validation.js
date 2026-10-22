const { z } = require("zod");

const workspaceBody = z.object({ workspace_name: z.string().min(2).max(120), custom_domain: z.string().min(3).max(253).toLowerCase(), owner_email: z.string().email() });
const domainBody = z.object({ domain: z.string().min(3).max(253).toLowerCase() });
const mailboxBody = z.object({ email_address: z.string().email().toLowerCase(), password: z.string().min(12).max(128) });
const sendBody = z.object({ sender: z.string().email(), recipient: z.string().email(), subject: z.string().max(998), text: z.string().max(100000).optional(), html: z.string().max(500000).optional() }).refine((v) => v.text || v.html, "text or html is required");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(Object.assign(new Error(result.error.issues.map((issue) => issue.message).join("; ")), { statusCode: 422 }));
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate, workspaceBody, domainBody, mailboxBody, sendBody };
