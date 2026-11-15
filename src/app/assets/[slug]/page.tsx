import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Box,
  Check,
  Download,
  FileArchive,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/auth";
import {
  categoryLabels,
  formatBytes,
  StoreHeader,
} from "@/components/store-ui";
import { isAdminEmail } from "@/lib/authz";
import { getResourceBySlugForUser } from "@/lib/resources";
import { ensureAppUser } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const admin = isAdminEmail(session.user.email);
  const user = await ensureAppUser(session);
  const { slug } = await params;
  const asset = await getResourceBySlugForUser(slug, user, admin);
  if (!asset) notFound();

  const hero = asset.previews[0];
  return (
    <main className="min-h-screen bg-[#f5f6f9] text-[#20222c]">
      <StoreHeader active="store" isAdmin={admin} session={session} />
      <div className="mx-auto max-w-[1320px] px-5 py-7 lg:px-8">
        <Link className="inline-flex items-center gap-2 text-xs font-semibold text-[#747784] hover:text-[#6c5ce7]" href="/library"><ArrowLeft size={14} /> Back to store</Link>
        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_420px]">
          <section>
            <div className="relative aspect-[1.55] overflow-hidden rounded-xl border border-[#dedfe6] bg-[#e4e5eb] shadow-sm">
              {hero ? <Image alt={hero.altText ?? asset.title} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 65vw" src={hero.imageUrl} /> : <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#bdb5ff,transparent_30%),linear-gradient(145deg,#e5e6ec,#cdd0dc)]"><Box className="text-[#6c5ce7]" size={64} strokeWidth={1.2} /></span>}
            </div>
            {asset.previews.length > 1 && <div className="mt-3 grid grid-cols-4 gap-3">{asset.previews.slice(1, 5).map((preview) => <div className="relative aspect-[1.5] overflow-hidden rounded-lg border border-[#dedfe6] bg-white" key={preview.id}><Image alt={preview.altText ?? asset.title} className="object-cover" fill sizes="20vw" src={preview.thumbUrl ?? preview.imageUrl} /></div>)}</div>}

            <article className="mt-7 rounded-xl border border-[#dedfe6] bg-white p-6 sm:p-8">
              <h2 className="text-lg font-bold">About this asset</h2>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#646775]">{asset.description || "No detailed description has been added for this asset yet."}</p>
              <div className="mt-7 grid gap-4 border-t border-[#ececf1] pt-6 sm:grid-cols-3">
                <Info label="Category" value={categoryLabels[asset.category] ?? "Other"} />
                <Info label="Version" value={asset.version ?? "Latest"} />
                <Info label="Format" value="ZIP archive" />
              </div>
            </article>
          </section>

          <aside>
            <div className="sticky top-24 rounded-xl border border-[#dedfe6] bg-white p-6 shadow-[0_12px_36px_rgba(30,33,45,.08)]">
              <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6c5ce7]">{categoryLabels[asset.category] ?? "Asset"}</span>
              <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-.035em]">{asset.title}</h1>
              <p className="mt-2 text-xs text-[#8a8d99]">by Arcwell Studio {asset.version ? `· Version ${asset.version}` : ""}</p>
              <div className="mt-6 rounded-lg bg-[#f3f1ff] p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5548bd]"><Check size={14} /> This asset is in your library</div>
                <p className="mt-1.5 text-[10px] leading-4 text-[#77718f]">Your account has an active personal download license.</p>
              </div>
              <a className="mt-5 flex h-12 items-center justify-center gap-2 rounded-lg bg-[#6c5ce7] text-sm font-bold text-white shadow-[0_8px_22px_rgba(108,92,231,.24)] hover:bg-[#5b4bd6]" href={`/api/resources/${asset.id}/download`}><Download size={17} /> Download asset</a>
              <div className="mt-5 divide-y divide-[#ececf1] border-y border-[#ececf1]">
                <Row icon={FileArchive} label="Download size" value={asset.file ? formatBytes(asset.file.size) : "ZIP"} />
                <Row icon={LockKeyhole} label="Access" value={asset.accessLevel === "restricted" ? "Invite only" : asset.accessLevel} />
                <Row icon={ShieldCheck} label="Integrity" value="SHA-256 verified" />
              </div>
              <p className="mt-5 text-center text-[9px] leading-4 text-[#9a9ca7]">Downloads are permission checked and recorded for security.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[9px] font-bold uppercase tracking-[.13em] text-[#a0a2ac]">{label}</span><strong className="mt-1.5 block text-xs text-[#343641]">{value}</strong></div>;
}

function Row({ icon: Icon, label, value }: { icon: typeof FileArchive; label: string; value: string }) {
  return <div className="flex items-center gap-3 py-3 text-xs"><Icon className="text-[#8d84d6]" size={15} /><span className="flex-1 text-[#818491]">{label}</span><strong className="text-[10px] text-[#40424c]">{value}</strong></div>;
}
