import Link from "next/link";
import {
  ArrowRight,
  Archive,
  Check,
  Download,
  ImageIcon,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Archive,
    title: "Một nơi cho mọi tài nguyên",
    copy: "Lưu trữ file ZIP, phiên bản và mô tả trong một thư viện có cấu trúc.",
  },
  {
    icon: ShieldCheck,
    title: "Quyền truy cập rõ ràng",
    copy: "Public, thành viên hoặc cấp quyền chính xác theo từng địa chỉ email.",
  },
  {
    icon: ImageIcon,
    title: "Preview trực quan",
    copy: "Ảnh preview được đẩy lên Pixhost và hiển thị ngay trên từng resource.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-pine text-white shadow-sm">
            <Archive size={19} strokeWidth={1.8} />
          </span>
          <span>
            <strong className="block text-sm tracking-[-0.02em]">Arcwell</strong>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted">Resource library</span>
          </span>
        </Link>
        <Link className="inline-flex items-center gap-2 rounded-full border border-pine/15 bg-white/65 px-4 py-2 text-sm font-medium text-pine backdrop-blur hover:-translate-y-0.5 hover:bg-white" href="/login">
          Đăng nhập <ArrowRight size={15} />
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-24 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-10 lg:pt-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-pine/10 bg-white/55 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">
            <LockKeyhole size={13} /> Kho tài nguyên riêng tư
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.055em] text-pine sm:text-6xl lg:text-[4.7rem]">Tài nguyên đúng người, đúng lúc.</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">Upload, tổ chức và chia sẻ các bộ tài nguyên ZIP với quyền download được kiểm soát. Gọn gàng cho quản trị viên, đơn giản cho người nhận.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link className="inline-flex h-12 items-center gap-3 rounded-xl bg-pine px-5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(25,58,43,.2)] hover:-translate-y-0.5 hover:bg-[#214a37]" href="/library">
              Mở thư viện <ArrowRight size={17} />
            </Link>
            <span className="inline-flex items-center gap-2 px-2 text-xs text-muted"><Check className="text-moss" size={15} /> Đăng nhập an toàn với Google</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 -z-10 rounded-full bg-moss/10 blur-3xl" />
          <div className="rotate-[1.5deg] rounded-[2rem] border border-white/80 bg-paper/90 p-4 shadow-[0_35px_90px_rgba(40,51,44,.14)] backdrop-blur">
            <div className="relative aspect-[1.45] overflow-hidden rounded-[1.45rem] bg-[#cbd3be]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_22%,#f5dcc6_0,transparent_28%),linear-gradient(145deg,#91aa83,#344c3d)]" />
              <div className="absolute inset-x-7 bottom-7 rounded-2xl border border-white/25 bg-[#14261dcc] p-5 text-white backdrop-blur-md">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">Featured collection</span>
                <h2 className="mt-2 text-xl font-medium tracking-tight">Botanical UI Kit</h2>
                <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/65">
                  <span>Version 2.4 · 184 MB</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 font-semibold text-pine"><Download size={13} /> ZIP</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-3 pb-2 pt-5 text-xs text-muted">
              <span>3 preview images</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-moss" /> Restricted access</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-pine/10 bg-white/35">
        <div className="mx-auto grid w-full max-w-7xl gap-px px-6 py-16 md:grid-cols-3 lg:px-10">
          {features.map(({ icon: Icon, title, copy }) => (
            <article className="border-pine/10 py-7 md:border-l md:px-8 first:md:border-l-0" key={title}>
              <Icon className="mb-5 text-clay" size={22} strokeWidth={1.7} />
              <h2 className="font-semibold tracking-tight text-pine">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
