import "server-only";
import { eq } from "drizzle-orm";

import { db, schema } from "@/server/db";
import type { AdminUser } from "@/server/db/schema";

export function findAdminByEmail(
  email: string,
): Promise<AdminUser | undefined> {
  return db.query.adminUsers.findFirst({
    where: eq(schema.adminUsers.email, email),
  });
}
