import "server-only";
import { env } from "@/lib/env";
import { type Result, ok, err } from "@/lib/result";

/**
 * Resolves a deferred interaction (library_docs.md §1). Edits the original
 * "thinking..." message via the interaction webhook token.
 */
export async function editOriginalResponse(
  interactionToken: string,
  content: string,
  options: { components?: unknown[] } = {},
): Promise<Result<void>> {
  const url = `https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interactionToken}/messages/@original`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        ...(options.components ? { components: options.components } : {}),
      }),
    });
    if (!res.ok) {
      return err(`discord followup PATCH failed: ${res.status}`);
    }
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error.message : "unknown error");
  }
}
