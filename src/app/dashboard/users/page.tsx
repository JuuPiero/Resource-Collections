import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRoundCog } from "lucide-react";
import { auth } from "@/auth";
import { DashboardNav, StoreHeader } from "@/components/store-ui";
import {
  UserManagementTable,
  type AdminUserRow,
} from "@/components/user-management";
import { isAdminEmail } from "@/lib/authz";
import { ensureAppUser, listUsersForAdmin } from "@/lib/users";

export const metadata: Metadata = { title: "User Management" };
export const dynamic = "force-dynamic";

export default async function DashboardUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!isAdminEmail(session.user.email)) redirect("/library");

  await ensureAppUser(session);
  const users = await listUsersForAdmin();
  const tableUsers: AdminUserRow[] = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    isAdmin: isAdminEmail(user.email),
  }));

  return (
    <main className="min-h-screen bg-[#101219] text-white">
      <StoreHeader active="dashboard" isAdmin session={session} />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1440px] flex-col lg:flex-row">
        <DashboardNav active="users" />
        <div className="min-w-0 flex-1 p-5 sm:p-8">
          <div className="mb-7">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b7cf6]">PiaStore administration</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-[-.04em]">
              <UserRoundCog className="text-[#a99eff]" size={27} /> User management
            </h1>
            <p className="mt-2 text-xs text-white/40">Review accounts and control whether members can sign in or download licensed assets.</p>
          </div>
          <UserManagementTable initialUsers={tableUsers} />
        </div>
      </div>
    </main>
  );
}
