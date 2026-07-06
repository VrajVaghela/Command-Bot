import "server-only";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the Auth.js config (architecture.md §3). No DB or bcrypt
 * import here — `middleware.ts` runs this on the Edge runtime, and pulling in
 * Node-only deps (bcryptjs, the Drizzle/Neon client) would break there. The
 * Credentials provider + DB lookup live in `src/server/auth.ts` instead,
 * which is only ever loaded by the Node route handler / Server Components.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
