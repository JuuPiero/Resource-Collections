import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Box,
  Boxes,
  Check,
  Code2,
  Gamepad2,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const categories = [
  { icon: Box, label: "3D Assets", tone: "bg-[#e8e3ff] text-[#6754d8]" },
  { icon: Layers3, label: "2D Assets", tone: "bg-[#dff4ff] text-[#2781ad]" },
  { icon: Code2, label: "Tools", tone: "bg-[#e0f6e8] text-[#278050]" },
  { icon: AudioLines, label: "Audio", tone: "bg-[#fff0d5] text-[#a66b08]" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f6f9] text-[#20222c]">
      <header className="border-b border-white/10 bg-[#111318] text-white">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-5 lg:px-8">
          <Link className="flex items-center gap-2.5" href="/"><span className="grid size-9 place-items-center rounded-lg bg-[#6c5ce7]"><Boxes size={19} /></span><span><strong className="block text-sm font-bold">PiaStore</strong><span className="block text-[9px] uppercase tracking-[.18em] text-white/40">Digital Resource Store</span></span></Link>
          <nav className="ml-10 hidden items-center gap-6 text-xs font-semibold text-white/55 md:flex"><span>Assets</span><span>Tools</span><span>Templates</span><span>Audio</span></nav>
          <Link className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-4 text-xs font-bold text-white hover:bg-white/5" href="/login">Sign in <ArrowRight size={14} /></Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#1d202a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_30%,rgba(108,92,231,.32),transparent_30%),radial-gradient(circle_at_15%_85%,rgba(45,183,121,.14),transparent_25%)]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#9b8fff]/30 bg-[#8274ee]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#c5beff]"><LockKeyhole size={12} /> Curated access · Personal licenses</span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.02] tracking-[-.055em] sm:text-6xl">Production-ready assets, shared personally.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/55">Explore tools, packs and templates in the PiaStore catalog. Everyone can browse published resources; downloads remain protected by their access licenses.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link className="inline-flex h-12 items-center gap-3 rounded-lg bg-[#6c5ce7] px-5 text-sm font-bold text-white shadow-[0_12px_30px_rgba(108,92,231,.25)] hover:bg-[#5b4bd6]" href="/library">Browse PiaStore <ArrowRight size={16} /></Link><span className="inline-flex items-center gap-2 px-3 text-xs text-white/45"><ShieldCheck size={15} className="text-emerald-400" /> Permission-protected downloads</span></div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-8 rounded-full bg-[#6c5ce7]/10 blur-3xl" />
            <div className="relative rotate-[1deg] rounded-2xl border border-white/10 bg-[#292c38] p-3 shadow-[0_35px_90px_rgba(0,0,0,.4)]">
              <div className="relative aspect-[1.45] overflow-hidden rounded-xl bg-[radial-gradient(circle_at_24%_25%,#a99eff,transparent_25%),linear-gradient(145deg,#3a405a,#181a22)]">
                <Gamepad2 className="absolute right-10 top-10 text-white/20" size={110} strokeWidth={1} />
                <div className="absolute inset-x-6 bottom-6 rounded-xl border border-white/10 bg-[#12141bbd] p-5 backdrop-blur-xl"><span className="text-[9px] font-bold uppercase tracking-[.16em] text-[#a99eff]">Featured package</span><h2 className="mt-2 text-2xl font-bold">Creator Toolkit Pro</h2><p className="mt-2 text-xs text-white/45">Editor tools · UI templates · Source included</p><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-[10px] text-white/40">Version 3.2 · 128 MB</span><span className="rounded-md bg-white px-3 py-1.5 text-[10px] font-bold text-[#2b2d36]">In your library</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 lg:px-8">
        <div className="flex items-end justify-between"><div><span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#6c5ce7]">Explore the catalog</span><h2 className="mt-2 text-2xl font-bold tracking-tight">Everything you need to build</h2></div><Link className="hidden items-center gap-2 text-xs font-bold text-[#6c5ce7] sm:inline-flex" href="/library">View PiaStore <ArrowRight size={14} /></Link></div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{categories.map(({ icon: Icon, label, tone }) => <Link className="group flex items-center gap-4 rounded-xl border border-[#dedfe6] bg-white p-5 shadow-sm hover:-translate-y-1 hover:shadow-lg" href="/library" key={label}><span className={`grid size-11 place-items-center rounded-xl ${tone}`}><Icon size={20} /></span><span className="text-sm font-bold">{label}</span><ArrowRight className="ml-auto text-[#b2b4be] group-hover:text-[#6c5ce7]" size={15} /></Link>)}</div>
      </section>

      <section className="border-y border-[#dedfe6] bg-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 py-14 md:grid-cols-3 lg:px-8">
          <Feature icon={Sparkles} title="Curated by one creator" copy="A focused personal catalog instead of an endless public marketplace." />
          <Feature icon={ShieldCheck} title="Licensed by account" copy="Every restricted asset appears only after the owner grants access to your email." />
          <Feature icon={Check} title="Always the right version" copy="Preview, version and verified ZIP delivery live together on every asset page." />
        </div>
      </section>

      <footer className="bg-[#111318] text-white"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-7 text-[10px] text-white/35 lg:px-8"><span>© 2026 PiaStore</span><span>Built for useful things worth keeping.</span></div></footer>
    </main>
  );
}

function Feature({ icon: Icon, title, copy }: { icon: typeof Sparkles; title: string; copy: string }) {
  return <article><span className="grid size-10 place-items-center rounded-lg bg-[#f0eefc] text-[#6c5ce7]"><Icon size={18} /></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-[#747784]">{copy}</p></article>;
}
