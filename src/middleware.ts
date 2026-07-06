import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/config";

/**
 * Route protection (architecture.md §3). Uses the edge-safe `authConfig`
 * only — never imports `@/server/auth` (Credentials + bcrypt + DB), which
 * would break on the Edge runtime middleware runs on. `authorized()` in
 * `authConfig` redirects to `pages.signIn` ("/login") when there's no
 * session; the matcher scopes this to the gated `(dashboard)` routes only,
 * leaving `/login` and `/api/**` (Discord interactions, Auth.js) untouched.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/commands/:path*", "/server/:path*"],
};
