import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/server/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-primary mb-6 text-center text-sm font-medium">
          Abstrait
        </p>
        <Card
          title="Admin sign in"
          description="Dashboard access is login-gated."
        >
          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
