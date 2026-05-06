/**
 * Lightweight Telegram Bot API helper for sending group-chat notifications.
 *
 * Reads credentials from environment variables:
 *   TELEGRAM_BOT_TOKEN  – Bot API token from @BotFather
 *   TELEGRAM_CHAT_ID    – Target chat / group ID (negative for groups)
 *
 * All sends are fire-and-forget so they never block the HTTP response.
 */

const TELEGRAM_API = "https://api.telegram.org";

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return { token, chatId };
}

/**
 * Send an HTML-formatted message to the configured Telegram chat.
 * Silently no-ops when credentials are missing so the app still works
 * without Telegram configured.
 */
export async function sendTelegramMessage(html: string): Promise<void> {
  const { token, chatId } = getConfig();
  if (!token || !chatId) {
    console.warn("[Telegram] Bot token or chat ID not configured — skipping notification.");
    return;
  }

  const url = `${TELEGRAM_API}/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Telegram] sendMessage failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error("[Telegram] sendMessage request error:", err);
  }
}
