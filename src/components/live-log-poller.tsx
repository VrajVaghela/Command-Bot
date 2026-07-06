"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 5000;

/**
 * Live-log update mechanism (code_standards.md §4): rather than websocket/SSE
 * infra, this re-fetches the current Server Component tree on an interval so
 * the command/action log stays current. Renders nothing.
 */
export function LiveLogPoller() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
