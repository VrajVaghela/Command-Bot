import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { env } from "@/lib/env";
import { type Result, ok, err } from "@/lib/result";

/**
 * AI triage (build_plan.md Phase 6 stretch, library_docs.md §5). Off unless
 * both `AI_ENABLED` and `GEMINI_API_KEY` are set — callers never need to
 * check the flag themselves, and a disabled/misconfigured setup degrades to
 * a plain `err`, never a throw (architecture.md §9).
 */

const GEMINI_MODEL = "gemini-2.5-flash-lite"; // free-tier, low-latency text model
const REQUEST_TIMEOUT_MS = 8_000; // stays well under the route's 20s maxDuration

const triageResultSchema = z.object({
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type ReportTriage = z.infer<typeof triageResultSchema>;

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

/** Parses + validates Gemini's raw JSON text response. Exported for unit testing. */
export function parseTriageResponse(
  text: string | undefined,
): Result<ReportTriage> {
  if (!text) return err("gemini returned no text");

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return err("gemini returned malformed json");
  }

  const parsed = triageResultSchema.safeParse(json);
  if (!parsed.success) return err("gemini returned malformed json");

  return ok(parsed.data);
}

/** Summarizes + tags a `/report` message. Never throws — every failure mode is an `err`. */
export async function triageReport(
  message: string,
): Promise<Result<ReportTriage>> {
  if (!env.AI_ENABLED || !env.GEMINI_API_KEY) {
    return err("ai disabled");
  }

  try {
    const response = await getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Triage this user-submitted report for a moderation team. " +
                "Reply with a one-sentence summary and up to 3 short topical tags.\n\n" +
                `Report: ${message}`,
            },
          ],
        },
      ],
      config: {
        httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
          required: ["summary"],
        },
      },
    });

    return parseTriageResponse(response.text);
  } catch (error) {
    return err(error instanceof Error ? error.message : "unknown ai error");
  }
}
