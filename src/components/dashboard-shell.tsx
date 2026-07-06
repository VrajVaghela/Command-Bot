import type { ReactNode } from "react";

import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/Button";
import { logout } from "@/server/actions/auth";

/** Auth-gated layout: sidebar + topbar (ui_rules.md §9). Auth guard lives in the layout. */
export function DashboardShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen">
      <aside className="border-border bg-card w-56 shrink-0 border-r p-4">
        <p className="text-primary px-3 text-sm font-semibold">Abstrait</p>
        <div className="mt-6">
          <DashboardNav />
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-border flex h-14 items-center justify-between border-b px-6">
          <span className="text-muted-foreground text-sm">{email}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
