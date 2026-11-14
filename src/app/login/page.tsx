import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Archive, ShieldCheck } from "lucide-react";
import { auth, signIn } from "@/auth";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/library");

  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-pine" href="/"><ArrowLeft size={14} /> Trở về trang chủ</Link>
        <section className="rounded-[1.75rem] border border-white bg-paper/90 p-8 shadow-[0_30px_80px_rgba(37,49,41,.12)] backdrop-blur sm:p-10">
          <span className="grid size-12 place-items-center rounded-2xl bg-pine text-white"><Archive size={21} /></span>
          <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Arcwell Resource Library</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-pine">Chào mừng trở lại.</h1>
          <p className="mt-3 text-sm leading-6 text-muted">Đăng nhập bằng tài khoản Google để xem những tài nguyên đã được cấp quyền cho bạn.</p>
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/library" }); }} className="mt-8">
            <button className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-pine/15 bg-white text-sm font-semibold text-pine shadow-sm hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-md" type="submit">
              <span className="grid size-5 place-items-center rounded-full bg-[conic-gradient(from_-45deg,#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] text-[10px] font-bold text-white">G</span>
              Tiếp tục với Google
            </button>
          </form>
          <div className="mt-7 flex gap-3 border-t border-line pt-6 text-xs leading-5 text-muted">
            <ShieldCheck className="mt-0.5 shrink-0 text-moss" size={16} />
            <p>Quyền quản trị chỉ được xác định từ <code className="rounded bg-pine/5 px-1 py-0.5 font-mono text-[10px]">ADMIN_EMAILS</code> trên máy chủ.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
