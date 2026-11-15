import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import { auth } from "@/auth";
import { AssetManagementTable } from "@/components/asset-management-table";
import { DashboardNav, StoreHeader } from "@/components/store-ui";
import { isAdminEmail } from "@/lib/authz";
import { listResourcesForUser } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "Asset Management" };
export const dynamic = "force-dynamic";

export default async function DashboardAssetsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/library");

  const user = await ensureAppUser(session);
  const items = await listResourcesForUser(user, true);

  return (
    <main className="min-h-screen bg-[#101219] text-white">
      <StoreHeader active="dashboard" isAdmin session={session} />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col lg:flex-row">
        <DashboardNav active="assets" />
        <div className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b7cf6]">PiaStore administration</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-.04em]">Asset management</h1>
              <p className="mt-2 text-xs text-white/40">Review every resource, edit its details, manage licenses, or remove it.</p>
            </div>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6c5ce7] px-4 text-xs font-bold text-white hover:bg-[#5b4bd6]"
              href="/dashboard#new-asset"
            >
              <Plus size={15} /> Upload asset <ArrowUpRight size={13} />
            </Link>
          </div>
          <AssetManagementTable items={items} />
        </div>
      </div>
    </main>
  );
}
