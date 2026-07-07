"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import {
  retryFailedActions,
  type RetryResult,
} from "@/server/mirror/retry-failed-actions";

/** Dashboard "Retry failed actions" button (build_plan.md Phase 5). */
export async function retryFailedActionsAction(): Promise<RetryResult[]> {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const results = await retryFailedActions();
  revalidatePath("/dashboard");
  return results;
}
