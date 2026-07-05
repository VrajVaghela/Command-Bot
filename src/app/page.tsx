export default function Home() {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-[var(--radius)] border p-6 shadow-sm">
        <p className="text-primary text-sm font-medium">Abstrait</p>
        <h1 className="mt-1 text-2xl font-semibold">Foundation ready</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Phase 1 scaffold: validated env, Neon + Drizzle schema, and design
          tokens are wired. The Discord interactions endpoint and admin
          dashboard come next.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="bg-success/15 text-success rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium">
            env validated
          </span>
          <span className="bg-info/15 text-info rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium">
            schema defined
          </span>
          <span className="bg-warning/15 text-warning rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium">
            endpoint pending
          </span>
        </div>
      </div>
    </main>
  );
}
