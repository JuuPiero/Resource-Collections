import type { Session } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes,
  ChevronRight,
  Download,
  Gauge,
  LogOut,
  PackageOpen,
  ShieldCheck,
} from "lucide-react";
import { signOut } from "@/auth";
import type { ResourceListItem } from "@/lib/resources";

export const categoryLabels: Record<string, string> = {
  "3d": "3D Assets",
  "2d": "2D Assets",
  audio: "Audio",
  tools: "Tools",
  templates: "Templates",
  addons: "Add-ons",
  other: "Other",
};

export function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function StoreHeader({
  session,
  isAdmin,
  active,
}: {
  session: Session;
  isAdmin: boolean;
  active?: "store" | "dashboard";
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#111318e8] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-7 px-5 lg:px-8">
        <Link className="flex shrink-0 items-center gap-2.5" href="/library">
          <span className="grid size-9 place-items-center rounded-lg bg-[#6c5ce7] text-white shadow-[0_0_28px_rgba(108,92,231,.3)]">
            <Boxes size={19} />
          </span>
          <span className="hidden sm:block">
            <strong className="block text-sm font-bold tracking-tight text-white">ARCWELL</strong>
            <span className="block text-[9px] uppercase tracking-[.18em] text-white/45">Private Asset Store</span>
          </span>
        </Link>

        <nav className="flex h-full items-center gap-1">
          <Link className={`flex h-full items-center border-b-2 px-3 text-xs font-semibold ${active === "store" ? "border-[#8b7cf6] text-white" : "border-transparent text-white/55 hover:text-white"}`} href="/library">Store</Link>
          {isAdmin && <Link className={`flex h-full items-center border-b-2 px-3 text-xs font-semibold ${active === "dashboard" ? "border-[#8b7cf6] text-white" : "border-transparent text-white/55 hover:text-white"}`} href="/dashboard">Dashboard</Link>}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="max-w-48 truncate text-xs font-semibold text-white">{session.user.name ?? session.user.email}</p>
            <p className="text-[9px] uppercase tracking-[.14em] text-white/40">{isAdmin ? "Store owner" : "Licensed member"}</p>
          </div>
          <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-[#a99eff]">
            {(session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase()}
          </span>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button aria-label="Sign out" className="grid size-9 place-items-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white" type="submit"><LogOut size={16} /></button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function AssetCard({ item }: { item: ResourceListItem }) {
  const preview = item.previews[0];
  return (
    <article className="group overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_7px_25px_rgba(28,31,43,.07)] transition hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(28,31,43,.14)]">
      <Link className="relative block aspect-[1.45] overflow-hidden bg-[#e7e8ed]" href={`/assets/${item.slug}`}>
        {preview ? (
          <Image alt={preview.altText ?? item.title} className="object-cover transition duration-500 group-hover:scale-[1.04]" fill sizes="(max-width: 768px) 100vw, 33vw" src={preview.thumbUrl ?? preview.imageUrl} />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_20%,#cdc7ff,transparent_36%),linear-gradient(145deg,#e6e8f3,#cfd3e4)] text-[#6c5ce7]"><PackageOpen size={38} strokeWidth={1.4} /></span>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-[#171922d9] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.1em] text-white backdrop-blur">{categoryLabels[item.category] ?? "Other"}</span>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link className="line-clamp-1 text-sm font-bold text-[#20222c] hover:text-[#6c5ce7]" href={`/assets/${item.slug}`}>{item.title}</Link>
            <p className="mt-1 text-[10px] font-medium text-[#8a8d9b]">Arcwell Studio {item.version ? `· v${item.version}` : ""}</p>
          </div>
          <span className="shrink-0 rounded-md bg-[#f0eefc] px-2 py-1 text-[9px] font-bold uppercase text-[#6c5ce7]">Owned</span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-[1.55] text-[#686b78]">{item.description || "A private digital asset from your licensed collection."}</p>
        <div className="mt-4 flex items-center justify-between border-t border-[#ececf1] pt-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#858895]"><ShieldCheck size={12} /> {item.accessLevel === "restricted" ? "Private license" : item.accessLevel}</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#343641]"><Download size={12} /> {item.file ? formatBytes(item.file.size) : "ZIP"}</span>
        </div>
      </div>
    </article>
  );
}

export function DashboardNav() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/8 bg-[#151720] p-4 lg:block">
      <p className="px-3 pb-3 pt-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/30">Management</p>
      <Link className="flex items-center gap-3 rounded-lg bg-[#6c5ce7] px-3 py-2.5 text-xs font-semibold text-white" href="/dashboard"><Gauge size={15} /> Overview</Link>
      <Link className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium text-white/55 hover:bg-white/5 hover:text-white" href="/library"><PackageOpen size={15} /> Asset storefront <ChevronRight className="ml-auto" size={13} /></Link>
    </aside>
  );
}
