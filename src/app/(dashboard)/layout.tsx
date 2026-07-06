import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { auth } from "@/server/auth";

/** Auth guard (architecture.md §3) — belt-and-suspenders with `middleware.ts`. */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <DashboardShell email={session.user.email ?? "admin"}>
      {children}
    </DashboardShell>
  );
}
