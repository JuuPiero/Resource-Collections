"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check, LoaderCircle, X } from "lucide-react";

function FormNotice({ error, success }: { error: string; success?: boolean }) {
  if (!error) return null;
  return (
    <p
      className={`flex items-center gap-2 border px-3 py-2.5 text-xs ${
        success
          ? "border-pine/40 bg-pine/10 text-pine"
          : "border-clay/40 bg-clay/10 text-clay"
      }`}
      role="status"
    >
      {success ? <Check size={14} /> : <X size={14} />}
      {error}
    </p>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Email or password is incorrect, or this account is disabled."
            : "Sign-in is unavailable. Check admin configuration and database availability for member accounts.",
        );
        return;
      }
      router.replace("/library");
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 grid gap-4" onSubmit={submit}>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Email address
        <input autoComplete="email" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" name="email" required type="email" />
      </label>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Password
        <input autoComplete="current-password" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" name="password" required type="password" />
      </label>
      <FormNotice error={error} />
      <button className="mt-1 inline-flex h-12 items-center justify-center gap-2 border border-pine bg-pine font-mono text-xs font-bold uppercase tracking-wider text-background hover:bg-[#d8ff9b] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">
        {busy && <LoaderCircle className="animate-spin" size={15} />}
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    if (password !== formData.get("confirmPassword")) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create your account.");
      router.replace("/login?registered=1");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create your account.");
      setBusy(false);
    }
  }

  return (
    <form className="mt-8 grid gap-4" onSubmit={submit}>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Display name
        <input autoComplete="name" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" maxLength={160} name="name" required />
      </label>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Email address
        <input autoComplete="email" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" maxLength={320} name="email" required type="email" />
      </label>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Password
        <input autoComplete="new-password" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" minLength={12} maxLength={128} name="password" required type="password" />
        <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-muted">Use at least 12 characters.</span>
      </label>
      <label className="grid gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-pine">
        Confirm password
        <input autoComplete="new-password" className="border border-line bg-background px-3.5 py-3 font-sans text-sm font-normal normal-case tracking-normal text-foreground outline-none placeholder:text-muted/60 focus:border-pine" minLength={12} maxLength={128} name="confirmPassword" required type="password" />
      </label>
      <FormNotice error={error} />
      <button className="mt-1 inline-flex h-12 items-center justify-center gap-2 border border-pine bg-pine font-mono text-xs font-bold uppercase tracking-wider text-background hover:bg-[#d8ff9b] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">
        {busy && <LoaderCircle className="animate-spin" size={15} />}
        {busy ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
