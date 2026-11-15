import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Boxes,
  Download,
  Eye,
  LockKeyhole,
  PackageCheck,
  Plus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import {
  PermissionManager,
  ResourceManager,
  UploadResourceForm,
} from "@/components/admin-tools";
import {
  categoryLabels,
  DashboardNav,
  formatBytes,
  StoreHeader,
} from "@/components/store-ui";
import { isAdminEmail } from "@/lib/authz";
import {
  getAdminDashboardStats,
  listResourcesForUser,
} from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "Owner Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/library");

  const user = await ensureAppUser(session);
  const [items, stats] = await Promise.all([
    listResourcesForUser(user, true),
    getAdminDashboardStats(),
  ]);

  return (
    <main className="min-h-screen bg-[#101219] text-white">
      <StoreHeader active="dashboard" isAdmin session={session} />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px]">
        <DashboardNav />
        <div className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b7cf6]">PiaStore owner workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-.04em]">Dashboard</h1><p className="mt-2 text-xs text-white/40">Manage your catalog, licenses and delivery pipeline.</p></div>
            <a className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6c5ce7] px-4 text-xs font-bold text-white hover:bg-[#5b4bd6]" href="#new-asset"><Plus size={15} /> Add asset</a>
          </div>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Metric icon={Boxes} label="Total assets" value={stats.resources} />
            <Metric icon={PackageCheck} label="Published" value={stats.published} />
            <Metric icon={LockKeyhole} label="Restricted" value={stats.restricted} />
            <Metric icon={Users} label="Accounts" value={stats.users} />
            <Metric icon={Download} label="Downloads" value={stats.downloads} />
          </section>

          <section className="mt-7 overflow-hidden rounded-xl border border-white/8 bg-[#191b24]" id="new-asset">
            <div className="border-b border-white/8 px-5 py-4"><h2 className="text-sm font-bold">Publish a new asset</h2><p className="mt-1 text-[10px] text-white/35">ZIP delivery, Pixhost previews and access rules in one release flow.</p></div>
            <div className="p-5 [&_input]:rounded-lg [&_select]:rounded-lg [&_textarea]:rounded-lg"><UploadResourceForm /></div>
          </section>

          <section className="mt-7">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold">Catalog management</h2><p className="mt-1 text-[10px] text-white/35">Edit resource details, remove uploads and manage access.</p></div><Link className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#a99eff] hover:text-white" href="/library"><Eye size={13} /> View PiaStore</Link></div>
            <div className="grid gap-4 xl:grid-cols-2">
              {items.map((item) => {
                const preview = item.previews[0];
                return <article className="overflow-hidden rounded-xl border border-white/8 bg-[#191b24]" key={item.id}>
                  <div className="flex gap-4 p-4">
                    <Link className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-[#272a36]" href={`/assets/${item.slug}`}>
                      {preview ? <Image alt="" className="object-cover" fill sizes="128px" src={preview.thumbUrl ?? preview.imageUrl} /> : <span className="absolute inset-0 grid place-items-center"><Boxes className="text-[#8b7cf6]" size={24} /></span>}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3"><div><Link className="line-clamp-1 text-sm font-bold hover:text-[#a99eff]" href={`/assets/${item.slug}`}>{item.title}</Link><p className="mt-1 text-[9px] uppercase tracking-[.11em] text-white/35">{categoryLabels[item.category] ?? "Other"} {item.version ? `· v${item.version}` : ""}</p></div><span className={`rounded px-2 py-1 text-[8px] font-black uppercase tracking-wider ${item.status === "published" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{item.status}</span></div>
                      <div className="mt-4 flex items-center gap-4 text-[9px] text-white/35"><span>{item.accessLevel}</span><span>{item.file ? formatBytes(item.file.size) : "No file"}</span><span>{item.permissions.length} licenses</span></div>
                    </div>
                  </div>
                  {item.accessLevel === "restricted" && <div className="[&_input]:rounded-md [&_button]:rounded-md"><PermissionManager initialEmails={item.permissions.map((permission) => permission.email)} resourceId={item.id} /></div>}
                  <ResourceManager item={item} />
                </article>;
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: number }) {
  return <article className="rounded-xl border border-white/8 bg-[#191b24] p-4"><span className="grid size-8 place-items-center rounded-lg bg-[#6c5ce7]/12 text-[#a99eff]"><Icon size={15} /></span><strong className="mt-4 block text-2xl font-bold tracking-tight">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-white/35">{label}</span></article>;
}
