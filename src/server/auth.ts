import "server-only";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { authConfig } from "@/server/auth/config";
import { verifyPassword } from "@/server/auth/password";
import { findAdminByEmail } from "@/server/db/admin-users";

/**
 * Node-only half of the Auth.js config (architecture.md §3, library_docs.md
 * §3): adds the Credentials provider, which needs the DB + bcrypt and so
 * must never load on the Edge runtime `middleware.ts` uses. Single admin
 * credential for MVP (project_overview.md §6 — no RBAC/multi-admin).
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const admin = await findAdminByEmail(parsed.data.email);
        if (!admin) return null;

        const valid = await verifyPassword(
          parsed.data.password,
          admin.passwordHash,
        );
        if (!valid) return null;

        return { id: admin.id, email: admin.email };
      },
    }),
  ],
});
