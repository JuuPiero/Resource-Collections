import Link from "next/link";
import {
  Archive,
  ArrowDownRight,
  ArrowRight,
  Check,
  Download,
  ImageIcon,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Archive,
    index: "01",
    title: "One place for every file",
    copy: "Keep ZIP archives, versions, and release notes together in a searchable library.",
  },
  {
    icon: ShieldCheck,
    index: "02",
    title: "Access by design",
    copy: "Choose public, member-only, or invite-only access for every collection.",
  },
  {
    icon: ImageIcon,
    index: "03",
    title: "Previews that pop",
    copy: "Add optimized screenshots so every resource is easy to recognize.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between border-b border-line/80 px-6 py-5 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center border border-pine bg-pine text-background shadow-[3px_3px_0_#617b45]">
            <Archive size={19} strokeWidth={2} />
          </span>
          <span>
            <strong className="block font-mono text-sm tracking-[0.12em] text-foreground">ARCWELL</strong>
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Digital archive / 01</span>
          </span>
        </Link>
        <Link className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-foreground hover:border-pine hover:text-pine" href="/login">
          Sign in <ArrowRight size={14} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 border border-pine/35 bg-pine/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-pine">
            <LockKeyhole size={13} /> Private archive system <span className="text-clay">/</span> v1.0
          </div>
          <h1 className="text-balance text-5xl font-semibold uppercase leading-[0.98] tracking-[-0.06em] text-foreground sm:text-6xl lg:text-[4.3rem] xl:text-[5.2rem]">
            <span className="block whitespace-nowrap">Your files.</span>
            <span className="block whitespace-nowrap text-pine">Your rules.</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            A carefully organized home for your digital resources. Upload, manage, and share ZIP collections with access that stays in your hands.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link className="inline-flex h-12 items-center gap-3 border border-pine bg-pine px-5 font-mono text-xs font-bold uppercase tracking-wider text-background shadow-[4px_4px_0_#617b45] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#617b45]" href="/library">
              Open the library <ArrowRight size={16} />
            </Link>
            <span className="inline-flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-wide text-muted"><Check className="text-pine" size={14} /> Password-protected access</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 -z-10 bg-pine/5 blur-3xl" />
          <div className="border-2 border-line bg-paper p-4 shadow-[8px_8px_0_rgb(198_241_122_/_16%)] sm:p-5">
            <div className="flex items-center justify-between border-b border-line pb-4 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span className="text-muted">Storage node <span className="text-pine">/ 01</span></span>
              <span className="inline-flex items-center gap-2 text-pine"><span className="size-2 animate-pulse bg-pine" /> Online</span>
            </div>
            <div className="relative mt-4 flex aspect-[1.42] flex-col justify-between overflow-hidden border border-line bg-[#202a20] p-5 sm:p-7">
              <div className="absolute right-6 top-6 grid grid-cols-4 gap-1 opacity-70" aria-hidden="true">
                {Array.from({ length: 16 }, (_, index) => <span className={`size-2 ${index % 3 === 0 ? "bg-clay" : "bg-pine/70"}`} key={index} />)}
              </div>
              <div className="relative">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-pine">Featured collection</p>
                <h2 className="mt-3 max-w-xs text-3xl font-semibold uppercase leading-tight tracking-tight text-foreground sm:text-4xl">Botanical<br />UI Kit</h2>
              </div>
              <div className="relative border-t border-line pt-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="font-mono text-[10px] uppercase leading-5 tracking-wide text-muted">
                    <p>Release <span className="text-foreground">2.4.0</span></p>
                    <p>Archive <span className="text-foreground">184 MB</span></p>
                  </div>
                  <span className="inline-flex items-center gap-2 border border-pine bg-pine px-3 py-2 font-mono text-[10px] font-bold uppercase text-background"><Download size={13} /> ZIP</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-muted">
              <span>03 preview frames</span>
              <span className="inline-flex items-center gap-2"><span className="size-2 bg-clay" /> Invite only</span>
            </div>
          </div>
          <span className="absolute -bottom-5 -left-5 hidden size-12 items-center justify-center border border-clay bg-background font-mono text-xl text-clay sm:flex"><ArrowDownRight size={22} /></span>
        </div>
      </section>

      <section className="border-t border-line bg-background/80">
        <div className="mx-auto grid w-full max-w-7xl gap-px px-6 py-12 md:grid-cols-3 lg:px-10 lg:py-16">
          {features.map(({ icon: Icon, index, title, copy }) => (
            <article className="group border border-line bg-paper/70 p-6 transition-colors hover:border-pine/50 sm:p-8" key={index}>
              <div className="flex items-center justify-between">
                <Icon className="text-clay" size={21} strokeWidth={1.8} />
                <span className="font-mono text-[10px] text-muted">SYS_{index}</span>
              </div>
              <h2 className="mt-8 font-mono text-sm font-bold uppercase tracking-wide text-pine">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </div>
        <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-5 font-mono text-[9px] uppercase tracking-[0.15em] text-muted lg:px-10">
          <span>Arcwell Resource Library</span>
          <span>Built for the keepers of good things</span>
        </footer>
      </section>
    </main>
  );
}
