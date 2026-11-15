"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck, UserRound, UserRoundCheck, UserRoundX } from "lucide-react";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  isAdmin: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UserManagementTable({
  initialUsers,
}: {
  initialUsers: AdminUserRow[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [busyUserId, setBusyUserId] = useState("");
  const [message, setMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.name?.toLowerCase().includes(normalizedQuery),
    );
  }, [query, users]);

  async function toggleActive(user: AdminUserRow) {
    const isActive = !user.isActive;
    if (
      !isActive &&
      !window.confirm(`Disable ${user.email}? They will no longer be able to sign in or download resources.`)
    ) {
      return;
    }

    setBusyUserId(user.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update user.");
      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, isActive } : entry,
        ),
      );
      setMessage(`${user.email} is now ${isActive ? "active" : "disabled"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update user.");
    } finally {
      setBusyUserId("");
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-[#191b24]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-sm font-bold">Accounts</h2>
          <p className="mt-1 text-[10px] text-white/40">{users.length} total accounts</p>
        </div>
        <label className="flex h-9 min-w-56 items-center gap-2 rounded-lg border border-white/10 bg-[#111318] px-3 text-white/45">
          <Search size={14} />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            type="search"
            value={query}
          />
        </label>
      </div>

      {message && (
        <p className="border-b border-white/8 px-5 py-3 text-xs text-amber-200" role="status">
          {message}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead className="bg-white/[.025] text-[9px] uppercase tracking-[.13em] text-white/40">
            <tr>
              <th className="px-5 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Last sign-in</th>
              <th className="px-5 py-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {filteredUsers.map((user) => (
              <tr className="text-xs text-white/75" key={user.id}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[#a99eff]">
                      {user.isAdmin ? <ShieldCheck size={16} /> : <UserRound size={16} />}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate font-semibold text-white">{user.name || "Unnamed user"}</strong>
                      <span className="mt-1 block truncate text-[10px] text-white/45">{user.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={user.isAdmin ? "font-bold text-[#a99eff]" : "text-white/55"}>
                    {user.isAdmin ? "Administrator" : "Member"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${user.isActive ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
                    {user.isActive ? <UserRoundCheck size={11} /> : <UserRoundX size={11} />}
                    {user.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-4 text-[10px] text-white/50">{formatDate(user.createdAt)}</td>
                <td className="px-4 py-4 text-[10px] text-white/50">{formatDate(user.lastLoginAt)}</td>
                <td className="px-5 py-4 text-right">
                  {user.isAdmin ? (
                    <span className="text-[9px] text-white/35">Protected account</span>
                  ) : (
                    <button
                      className={`rounded-md border px-3 py-2 text-[10px] font-bold disabled:opacity-50 ${user.isActive ? "border-rose-300/20 text-rose-200 hover:bg-rose-400/10" : "border-emerald-300/20 text-emerald-200 hover:bg-emerald-400/10"}`}
                      disabled={busyUserId === user.id}
                      onClick={() => void toggleActive(user)}
                      type="button"
                    >
                      {busyUserId === user.id ? "Updating..." : user.isActive ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!filteredUsers.length && (
              <tr>
                <td className="px-5 py-12 text-center text-xs text-white/40" colSpan={6}>
                  {users.length ? "No users match your search." : "No registered users yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
