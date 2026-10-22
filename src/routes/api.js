const express = require("express");
const env = require("../config/env");
const { requireInboundSecret } = require("../middlewares/auth");
const { validate, workspaceBody, domainBody, mailboxBody, sendBody } = require("../middlewares/validation");
const controller = require("../controllers/controllers");

const router = express.Router();
router.post("/workspaces", validate(workspaceBody), controller.registerWorkspace);
router.post("/workspaces/:id/domains", validate(domainBody), controller.addDomain);
router.post("/workspaces/:id/domains/verify", controller.verifyDomain);
router.post("/workspaces/:id/mailboxes", validate(mailboxBody), controller.createMailbox);
router.get("/workspaces/:id/mailboxes", controller.listMailboxes);
router.post("/mail/send", validate(sendBody), controller.sendMail);
router.post("/mail/inbound-webhook", express.raw({ type: ["message/rfc822", "application/octet-stream"], limit: env.MAX_RAW_MAIL_BYTES }), requireInboundSecret, controller.inboundWebhook);
router.get("/mailboxes/:mail_id/messages", controller.listMessages);

module.exports = router;
