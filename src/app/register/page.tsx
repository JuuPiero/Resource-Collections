import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Archive } from "lucide-react";
import { RegisterForm } from "@/components/auth-forms";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await auth();
  if (session) redirect("/library");

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-pine" href="/">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <section className="border-2 border-line bg-paper p-8 shadow-[8px_8px_0_rgb(198_241_122_/_14%)] sm:p-10">
          <div className="flex items-center justify-between">
            <span className="grid size-12 place-items-center border border-pine bg-pine text-background"><Archive size={21} /></span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">New account / 02</span>
          </div>
          <p className="mt-8 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Join the archive</p>
          <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[-0.04em] text-foreground">Create account.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Set up an email and password to start using your library.</p>
          <RegisterForm />
          <p className="mt-5 text-center text-xs text-muted">
            Already have an account? <Link className="font-semibold text-pine underline decoration-pine/40 underline-offset-4 hover:text-foreground" href="/login">Sign in</Link>
          </p>
          <p className="mt-6 border-t border-line pt-5 font-mono text-[10px] leading-5 text-muted">
            Email ownership is not verified. Use an address you own; restricted resource access is granted by email.
          </p>
        </section>
      </div>
    </main>
  );
}
