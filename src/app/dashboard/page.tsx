import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Download,
  LockKeyhole,
  PackageCheck,
  Plus,
  Users,
} from "lucide-react";
import { auth } from "@/auth";
import { UploadResourceForm } from "@/components/admin-tools";
import {
  DashboardNav,
  StoreHeader,
} from "@/components/store-ui";
import { isAdminEmail } from "@/lib/authz";
import { getAdminDashboardStats } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "Owner Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/library");

  await ensureAppUser(session);
  const stats = await getAdminDashboardStats();

  return (
    <main className="min-h-screen bg-[#101219] text-white">
      <StoreHeader active="dashboard" isAdmin session={session} />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col lg:flex-row">
        <DashboardNav active="overview" />
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
            <div className="mb-4">
              <h2 className="text-sm font-bold">Management tools</h2>
              <p className="mt-1 text-[10px] text-white/35">Manage your catalog and member accounts from dedicated tables.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ManagementCard
                description="Edit resource details, change publishing and access settings, manage licenses, or delete ZIPs."
                href="/dashboard/assets"
                icon={Boxes}
                label="Manage assets"
              />
              <ManagementCard
                description="Review member accounts, check activity, and enable or disable account access."
                href="/dashboard/users"
                icon={Users}
                label="Manage users"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ManagementCard({
  description,
  href,
  icon: Icon,
  label,
}: {
  description: string;
  href: string;
  icon: typeof Boxes;
  label: string;
}) {
  return (
    <Link className="group rounded-xl border border-white/8 bg-[#191b24] p-5 transition hover:border-[#8b7cf6]/50 hover:bg-[#1e202b]" href={href}>
      <span className="grid size-9 place-items-center rounded-lg bg-[#6c5ce7]/15 text-[#a99eff]"><Icon size={17} /></span>
      <span className="mt-4 flex items-center justify-between text-sm font-bold text-white">
        {label}<ArrowRight className="text-white/35 transition group-hover:translate-x-1 group-hover:text-[#a99eff]" size={15} />
      </span>
      <span className="mt-2 block text-[10px] leading-5 text-white/40">{description}</span>
    </Link>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Boxes; label: string; value: number }) {
  return <article className="rounded-xl border border-white/8 bg-[#191b24] p-4"><span className="grid size-8 place-items-center rounded-lg bg-[#6c5ce7]/12 text-[#a99eff]"><Icon size={15} /></span><strong className="mt-4 block text-2xl font-bold tracking-tight">{value}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.12em] text-white/35">{label}</span></article>;
}
