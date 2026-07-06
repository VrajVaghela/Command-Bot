"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login } from "@/server/actions/auth";

/** Admin credentials login (ui_registry.md) — Auth.js, inline errors, useActionState. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      {state?.error && <p className="text-danger text-sm">{state.error}</p>}
      <Button type="submit" loading={pending} className="mt-2">
        Sign in
      </Button>
    </form>
  );
}
