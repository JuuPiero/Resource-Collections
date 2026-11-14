import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  Download,
  FileArchive,
  LogOut,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { auth, signOut } from "@/auth";
import { PermissionManager, UploadResourceForm } from "@/components/admin-tools";
import { isAdminEmail } from "@/lib/authz";
import { listResourcesForUser } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "Library" };
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
    return <SetupError message={error instanceof Error ? error.message : "The database is unavailable."} />;
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="sticky top-0 z-10 border-b border-line bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-9 place-items-center border border-pine bg-pine text-background"><Archive size={17} /></span>
            <span><strong className="block font-mono text-xs tracking-[0.12em] text-foreground">ARCWELL</strong><span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted">Resource library</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-foreground">{session.user.name ?? session.user.email}</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-pine">{isAdmin ? "Administrator" : "Member"}</p>
            </div>
            {session.user.image ? <Image alt="" className="size-9 rounded-full border border-line object-cover" height={36} src={session.user.image} width={36} /> : null}
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button aria-label="Sign out" className="grid size-9 place-items-center border border-line bg-paper text-muted hover:border-clay hover:text-clay" type="submit"><LogOut size={16} /></button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-6 pt-10 lg:px-10 lg:pt-14">
        <section className="flex flex-col justify-between gap-6 border-b border-line pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Archive index / 01</p>
            <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[-0.05em] text-foreground sm:text-5xl">Your library.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">The collections you can access, ready to browse and download.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 border border-line bg-paper px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-muted">
            <ShieldCheck className="text-pine" size={14} /> {items.length} {items.length === 1 ? "resource" : "resources"} available
          </span>
        </section>

        {isAdmin && (
          <section className="mt-9 grid overflow-hidden border-2 border-line bg-paper shadow-[6px_6px_0_rgb(198_241_122_/_10%)] lg:grid-cols-[.72fr_1.28fr]">
            <div className="border-b border-line bg-pine p-7 text-background lg:border-b-0 lg:border-r lg:p-9">
              <Settings2 className="text-background" size={22} />
              <p className="mt-8 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-background/65">Administrator console</p>
              <h2 className="mt-3 text-2xl font-semibold uppercase tracking-tight">Add a resource</h2>
              <p className="mt-3 text-sm leading-6 text-background/80">Hash archives in your browser, optimize previews, and upload directly to object storage.</p>
            </div>
            <div className="p-6 sm:p-8"><UploadResourceForm /></div>
          </section>
        )}

        <section className="mt-12">
          {items.length === 0 ? (
            <div className="grid min-h-72 place-items-center border border-dashed border-line bg-paper/50 p-8 text-center">
              <div>
                <FileArchive className="mx-auto text-moss" size={30} strokeWidth={1.5} />
                <h2 className="mt-4 font-mono text-sm font-bold uppercase text-foreground">No resources yet</h2>
                <p className="mt-2 text-sm text-muted">{isAdmin ? "Add your first resource using the form above." : "An administrator has not shared a resource with you yet."}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item, index) => {
                const preview = item.previews[0];
                return (
                  <article className="overflow-hidden border border-line bg-paper shadow-[4px_4px_0_rgb(255_255_255_/_3%)]" key={item.id}>
                    <div className="relative aspect-[1.55] overflow-hidden border-b border-line bg-[#202a20]">
                      {preview ? (
                        <Image alt={preview.altText ?? item.title} className="object-cover transition duration-500 hover:scale-[1.03]" fill sizes="(max-width: 768px) 100vw, 33vw" src={preview.thumbUrl ?? preview.imageUrl} />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_20%,#475b38,transparent_32%),linear-gradient(145deg,#293b2b,#141b16)]">
                          <Archive className="text-pine/70" size={36} strokeWidth={1.3} />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 border border-line bg-background/90 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-foreground backdrop-blur">{item.accessLevel}</span>
                      <span className="absolute right-3 top-3 bg-background/90 px-2 py-1 font-mono text-[9px] uppercase text-muted">ARC-{String(index + 1).padStart(3, "0")}</span>
                      {isAdmin && <span className={`absolute bottom-3 right-3 px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.13em] ${item.status === "published" ? "bg-pine text-background" : "border border-clay bg-background text-clay"}`}>{item.status}</span>}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-semibold tracking-tight text-foreground">{item.title}</h2>
                          {item.version && <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-clay">Version {item.version}</p>}
                        </div>
                        {item.file && <span className="shrink-0 font-mono text-[10px] text-muted">{formatBytes(item.file.size)}</span>}
                      </div>
                      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted">{item.description || "No description provided."}</p>
                      <a className="mt-5 flex h-10 items-center justify-center gap-2 border border-pine bg-pine font-mono text-[10px] font-bold uppercase tracking-wider text-background hover:bg-[#d8ff9b]" href={`/api/resources/${item.id}/download`}>
                        <Download size={14} /> Download ZIP
                      </a>
                    </div>
                    {isAdmin && item.accessLevel === "restricted" && <PermissionManager initialEmails={item.permissions.map((permission) => permission.email)} resourceId={item.id} />}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SetupError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="max-w-lg border-2 border-clay/40 bg-paper p-8 shadow-[6px_6px_0_rgb(255_128_94_/_14%)]">
        <Archive className="text-clay" size={24} />
        <h1 className="mt-5 text-2xl font-semibold uppercase tracking-tight text-foreground">Backend not ready</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-6 border border-line bg-background p-4 font-mono text-[10px] leading-6 text-muted">
          1. Copy .env.example to .env.local<br />
          2. Add AUTH_SECRET and DATABASE_URL<br />
          3. Run npm run db:migrate
        </div>
      </section>
    </main>
  );
}
