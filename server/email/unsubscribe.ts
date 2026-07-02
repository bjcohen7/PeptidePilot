import { Router } from "express";
import { verifyUnsubscribeToken } from "./schema";
import { suppressLead } from "./queue";

const unsubscribeRouter = Router();

/**
 * GET /api/email/unsubscribe?token=<base64url>
 * Verifies the HMAC token and suppresses the lead.
 * Redirects to a simple confirmation page.
 */
unsubscribeRouter.get("/", async (req, res) => {
  const token = req.query.token as string;

  if (!token) {
    res.status(400).send("Invalid unsubscribe link.");
    return;
  }

  const leadId = verifyUnsubscribeToken(token);
  if (!leadId) {
    res.status(400).send("Invalid or expired unsubscribe link.");
    return;
  }

  await suppressLead(leadId, "unsubscribe");

  // Simple confirmation HTML page
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — PeptidePilot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f8f9fa; color: #1a1a2e; }
    .card { background: white; border-radius: 12px; padding: 40px; max-width: 480px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { font-size: 15px; color: #4a4a6a; margin: 0 0 24px; line-height: 1.5; }
    a { color: #0d9488; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You've been unsubscribed</h1>
    <p>You won't receive any more emails from PeptidePilot. If this was a mistake, you can re-subscribe by completing the quiz again.</p>
    <a href="https://www.peptidepilot.me">Back to PeptidePilot</a>
  </div>
</body>
</html>`);
});

export default unsubscribeRouter;
