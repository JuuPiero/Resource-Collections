import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Archive, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth-forms";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/library");
  const { registered } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-pine" href="/">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <section className="border-2 border-line bg-paper p-8 shadow-[8px_8px_0_rgb(198_241_122_/_14%)] sm:p-10">
          <div className="flex items-center justify-between">
            <span className="grid size-12 place-items-center border border-pine bg-pine text-background"><Archive size={21} /></span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">Account terminal / 01</span>
          </div>
          <p className="mt-8 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Arcwell Resource Library</p>
          <h1 className="mt-3 text-3xl font-semibold uppercase tracking-[-0.04em] text-foreground">Welcome back.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Sign in with your email and password to access your library.</p>
          {registered === "1" && <p className="mt-5 border border-pine/40 bg-pine/10 px-3 py-2.5 text-xs text-pine" role="status">Your account is ready. Sign in to continue.</p>}
          <LoginForm />
          <p className="mt-5 text-center text-xs text-muted">
            New to Arcwell? <Link className="font-semibold text-pine underline decoration-pine/40 underline-offset-4 hover:text-foreground" href="/register">Create an account</Link>
          </p>
          <div className="mt-7 flex gap-3 border-t border-line pt-6 font-mono text-[10px] leading-5 text-muted">
            <ShieldCheck className="mt-0.5 shrink-0 text-pine" size={16} />
            <p>The administrator account is preconfigured by the server and cannot be created through public registration.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
