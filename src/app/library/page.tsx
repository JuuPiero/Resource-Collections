import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, Download, FileArchive, LogOut, Settings2, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";
import { PermissionManager, UploadResourceForm } from "@/components/admin-tools";
import { isAdminEmail } from "@/lib/authz";
import { listResourcesForUser } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "Thư viện" };
export const dynamic = "force-dynamic";

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export default async function LibraryPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isAdmin = isAdminEmail(session.user.email);
  let items;
  try {
    const appUser = await ensureAppUser(session);
    items = await listResourcesForUser(appUser, isAdmin);
  } catch (error) {
    return <SetupError message={error instanceof Error ? error.message : "Database is unavailable."} />;
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-pine/10 bg-[#f4f1e9e8] backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link className="flex items-center gap-3" href="/"><span className="grid size-9 place-items-center rounded-xl bg-pine text-white"><Archive size={17} /></span><strong className="text-sm tracking-tight text-pine">Arcwell Library</strong></Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-xs font-semibold text-pine">{session.user.name ?? session.user.email}</p><p className="text-[10px] uppercase tracking-[0.12em] text-muted">{isAdmin ? "Administrator" : "Member"}</p></div>
            {session.user.image ? <Image alt="" className="size-9 rounded-full border border-white object-cover shadow-sm" height={36} src={session.user.image} width={36} /> : null}
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><button aria-label="Đăng xuất" className="grid size-9 place-items-center rounded-xl border border-pine/10 bg-white/60 text-muted hover:bg-white hover:text-pine" type="submit"><LogOut size={16} /></button></form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-6 pt-12 lg:px-10">
        <section className="flex flex-col justify-between gap-6 border-b border-pine/10 pb-9 sm:flex-row sm:items-end">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Resource collection</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-pine sm:text-5xl">Thư viện của bạn.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Các bộ tài nguyên bạn được phép truy cập, luôn đúng phiên bản và sẵn sàng để tải xuống.</p></div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-pine/10 bg-white/60 px-3 py-1.5 text-xs text-muted"><ShieldCheck className="text-moss" size={14} /> {items.length} resource khả dụng</span>
        </section>

        {isAdmin && <section className="mt-10 grid overflow-hidden rounded-3xl border border-pine/10 bg-paper/80 shadow-[0_18px_55px_rgba(40,51,44,.07)] lg:grid-cols-[.72fr_1.28fr]">
          <div className="border-b border-pine/10 bg-pine p-7 text-white lg:border-b-0 lg:border-r lg:p-9"><Settings2 className="text-[#b8cbaa]" size={22} /><p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Admin workspace</p><h2 className="mt-3 text-2xl font-semibold tracking-tight">Thêm resource mới</h2><p className="mt-3 text-sm leading-6 text-white/60">Browser tự hash ZIP, tối ưu preview và upload thẳng lên object storage. Server chỉ ký URL, xác thực và lưu metadata.</p></div>
          <div className="p-6 sm:p-8"><UploadResourceForm /></div>
        </section>}

        <section className="mt-12">
          {items.length === 0 ? <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-pine/20 bg-white/25 p-8 text-center"><div><FileArchive className="mx-auto text-moss" size={30} strokeWidth={1.5} /><h2 className="mt-4 font-semibold text-pine">Chưa có tài nguyên nào</h2><p className="mt-2 text-sm text-muted">{isAdmin ? "Upload resource đầu tiên ở biểu mẫu phía trên." : "Admin chưa cấp resource cho tài khoản này."}</p></div></div> : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const preview = item.previews[0];
                return <article className="overflow-hidden rounded-3xl border border-pine/10 bg-paper/85 shadow-[0_15px_45px_rgba(40,51,44,.07)]" key={item.id}>
                  <div className="relative aspect-[1.55] overflow-hidden bg-[#d7ddcf]">
                    {preview ? <Image alt={preview.altText ?? item.title} className="object-cover transition duration-500 hover:scale-[1.03]" fill sizes="(max-width: 768px) 100vw, 33vw" src={preview.thumbUrl ?? preview.imageUrl} /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_20%,#f2d7c4,transparent_32%),linear-gradient(145deg,#a7b99b,#536859)]"><Archive className="text-white/75" size={36} strokeWidth={1.3} /></div>}
                    <span className="absolute left-4 top-4 rounded-full border border-white/25 bg-[#13241bbd] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur">{item.accessLevel}</span>
                    {isAdmin && <span className={`absolute right-4 top-4 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.13em] ${item.status === "published" ? "bg-[#dcebd4] text-[#345234]" : "bg-[#f4dfca] text-[#7a492f]"}`}>{item.status}</span>}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold tracking-tight text-pine">{item.title}</h2>{item.version && <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-clay">Version {item.version}</p>}</div>{item.file && <span className="shrink-0 text-[10px] text-muted">{formatBytes(item.file.size)}</span>}</div>
                    <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted">{item.description || "Không có mô tả cho resource này."}</p>
                    <a className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-pine text-xs font-semibold text-white hover:-translate-y-0.5 hover:bg-[#214a37]" href={`/api/resources/${item.id}/download`}><Download size={14} /> Tải file ZIP</a>
                  </div>
                  {isAdmin && item.accessLevel === "restricted" && <PermissionManager initialEmails={item.permissions.map((permission) => permission.email)} resourceId={item.id} />}
                </article>;
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SetupError({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center px-6"><section className="max-w-lg rounded-3xl border border-clay/20 bg-paper p-8 shadow-xl"><Archive className="text-clay" size={24} /><h1 className="mt-5 text-2xl font-semibold tracking-tight text-pine">Backend chưa sẵn sàng</h1><p className="mt-3 text-sm leading-6 text-muted">{message}</p><div className="mt-6 rounded-xl bg-pine/5 p-4 font-mono text-xs leading-6 text-pine">1. Copy .env.example thành .env.local<br />2. Điền Google OAuth và DATABASE_URL<br />3. Chạy npm run db:migrate</div></section></main>;
}
