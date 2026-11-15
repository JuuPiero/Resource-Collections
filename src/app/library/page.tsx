import type { Metadata } from "next";
import Link from "next/link";
import {
  Box,
  ChevronRight,
  Gamepad2,
  LayoutGrid,
  Search,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import {
  AssetCard,
  categoryLabels,
  StoreHeader,
} from "@/components/store-ui";
import { isAdminEmail } from "@/lib/authz";
import { listResourcesForUser } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const metadata: Metadata = { title: "PiaStore" };
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  const { q = "", category = "all" } = await searchParams;

  let items;
  try {
    const user = session ? await ensureAppUser(session) : null;
    items = await listResourcesForUser(user, isAdmin);
  } catch (error) {
    return <SetupError message={error instanceof Error ? error.message : "The database is unavailable."} />;
  }

  const query = q.trim().toLowerCase();
  const filtered = items.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });
  const categoryCounts = new Map<string, number>();
  for (const item of items) {
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-[#f5f6f9] text-[#20222c]">
      <StoreHeader active="store" isAdmin={isAdmin} session={session} />

      <section className="border-b border-[#dedfe6] bg-[#1d202a] text-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 lg:grid-cols-[1fr_420px] lg:px-8 lg:py-14">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8b7cf6]/30 bg-[#8b7cf6]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#bdb5ff]"><Sparkles size={12} /> PiaStore public catalog</span>
            <h1 className="mt-5 text-4xl font-bold tracking-[-.045em] sm:text-5xl">Assets built for your next idea.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">Explore the complete published catalog. Sign in or request access to download licensed resources.</p>
            <form className="mt-7 flex max-w-xl overflow-hidden rounded-lg border border-white/10 bg-white" method="get">
              <span className="grid w-12 place-items-center text-[#8b8e9a]"><Search size={17} /></span>
              <input className="h-12 min-w-0 flex-1 bg-transparent pr-3 text-sm text-[#242630] outline-none placeholder:text-[#a4a6b0]" defaultValue={q} name="q" placeholder="Search assets, tools, templates..." />
              {category !== "all" && <input name="category" type="hidden" value={category} />}
              <button className="m-1 rounded-md bg-[#6c5ce7] px-5 text-xs font-bold text-white hover:bg-[#5b4bd6]" type="submit">Search</button>
            </form>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <div className="relative grid size-56 place-items-center rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,#8b7cf6,transparent_34%),linear-gradient(145deg,#31354a,#171922)] shadow-[0_25px_70px_rgba(0,0,0,.3)]">
              <Gamepad2 className="text-white/85" size={72} strokeWidth={1.2} />
              <span className="absolute -bottom-3 -right-3 rounded-xl bg-[#ffb52d] px-4 py-2 text-[10px] font-black uppercase tracking-[.12em] text-[#2a220f]">Private store</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] gap-7 px-5 py-8 lg:px-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#9a9ca8]">Browse categories</p>
          <CategoryLink active={category === "all"} count={items.length} href="/library" label="All assets" />
          {Object.entries(categoryLabels).map(([key, label]) => (
            <CategoryLink active={category === key} count={categoryCounts.get(key) ?? 0} href={`/library?category=${key}`} key={key} label={label} />
          ))}
          <div className="mt-7 rounded-xl border border-[#dedfe6] bg-white p-4">
            <Box className="text-[#6c5ce7]" size={19} />
            <p className="mt-3 text-xs font-bold">Personal licenses</p>
            <p className="mt-1.5 text-[11px] leading-5 text-[#777a87]">Browse every published resource. Download access depends on its license.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#9a9ca8]">{category === "all" ? "All categories" : categoryLabels[category] ?? "Assets"}</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">{query ? `Results for “${q}”` : "Published assets"}</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#dedfe6] bg-white px-3 py-2 text-[10px] font-semibold text-[#777a87]"><LayoutGrid size={13} /> {filtered.length} items</span>
          </div>

          {filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => <AssetCard item={item} key={item.id} />)}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-[#d4d5dc] bg-white p-8 text-center">
              <div><Box className="mx-auto text-[#aaa7cb]" size={34} strokeWidth={1.4} /><h3 className="mt-4 text-sm font-bold">No assets found</h3><p className="mt-2 text-xs text-[#858895]">Try another category or ask the store owner for access.</p></div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CategoryLink({ active, count, href, label }: { active: boolean; count: number; href: string; label: string }) {
  return <Link className={`mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs ${active ? "bg-[#ece9ff] font-bold text-[#5d4ed0]" : "font-medium text-[#696c78] hover:bg-white hover:text-[#333640]"}`} href={href}><ChevronRight size={12} /><span className="flex-1">{label}</span><span className="text-[9px] opacity-60">{count}</span></Link>;
}

function SetupError({ message }: { message: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f5f6f9] px-6 text-[#20222c]"><section className="max-w-lg rounded-xl border border-[#dedfe6] bg-white p-8 shadow-xl"><Box className="text-[#6c5ce7]" size={24} /><h1 className="mt-5 text-2xl font-bold tracking-tight">Backend is not ready</h1><p className="mt-3 text-sm leading-6 text-[#6f7280]">{message}</p><div className="mt-6 rounded-lg bg-[#f1efff] p-4 font-mono text-xs leading-6 text-[#5548bd]">1. Configure Render environment variables<br />2. Run npm run db:migrate<br />3. Restart the service</div></section></main>;
}
