import "server-only";
import { type Result, ok, err } from "@/lib/result";

export type MirrorTarget = {
  mirrorType: "slack" | "discord";
  mirrorWebhookUrl: string;
};

/**
 * Sends a notification to the second channel (library_docs.md §4) — a Slack
 * Incoming Webhook (`{text}`) or a Discord channel webhook (`{content}`).
 * The webhook URL is a secret; never logged.
 */
export async function sendMirrorNotification(
  target: MirrorTarget,
  content: string,
): Promise<Result<void>> {
  const body = target.mirrorType === "slack" ? { text: content } : { content };

  try {
    const res = await fetch(target.mirrorWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return err(`mirror webhook failed: ${res.status}`);
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error.message : "unknown error");
  }
}
