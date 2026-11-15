"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Box, ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

type AssetPreview = {
  id: string;
  imageUrl: string;
  thumbUrl: string | null;
  altText: string | null;
};

export function AssetGallery({
  title,
  previews,
}: {
  title: string;
  previews: AssetPreview[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activePreview = previews[activeIndex];
  const hasMultiple = previews.length > 1;

  function showPreview(index: number) {
    setActiveIndex((index + previews.length) % previews.length);
  }

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft" && hasMultiple) {
        setActiveIndex((index) => (index - 1 + previews.length) % previews.length);
      }
      if (event.key === "ArrowRight" && hasMultiple) {
        setActiveIndex((index) => (index + 1) % previews.length);
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultiple, lightboxOpen, previews.length]);

  return (
    <>
      <div>
        <div className="group relative aspect-[1.55] overflow-hidden rounded-xl border border-[#dedfe6] bg-[#e4e5eb] shadow-sm">
          {activePreview ? (
            <button
              aria-label={`Enlarge ${title} preview ${activeIndex + 1}`}
              className="absolute inset-0 size-full cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              type="button"
            >
              <Image
                alt={activePreview.altText ?? title}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 65vw"
                src={activePreview.thumbUrl ?? activePreview.imageUrl}
              />
              <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-lg bg-[#111318d9] px-3 py-2 text-[10px] font-semibold text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Maximize2 size={13} /> Click to enlarge
              </span>
            </button>
          ) : (
            <span className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#bdb5ff,transparent_30%),linear-gradient(145deg,#e5e6ec,#cdd0dc)]">
              <Box className="text-[#6c5ce7]" size={64} strokeWidth={1.2} />
            </span>
          )}

          {hasMultiple && (
            <>
              <button
                aria-label="Previous preview"
                className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[#111318cc] text-white shadow transition hover:bg-[#111318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => showPreview(activeIndex - 1)}
                type="button"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                aria-label="Next preview"
                className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-[#111318cc] text-white shadow transition hover:bg-[#111318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={() => showPreview(activeIndex + 1)}
                type="button"
              >
                <ChevronRight size={20} />
              </button>
              <span className="absolute bottom-4 left-4 z-10 rounded-md bg-[#111318cc] px-2.5 py-1.5 font-mono text-[10px] text-white">
                {activeIndex + 1} / {previews.length}
              </span>
            </>
          )}
        </div>

        {hasMultiple && (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
            {previews.map((preview, index) => (
              <button
                aria-label={`Show preview ${index + 1}`}
                aria-pressed={index === activeIndex}
                className={`relative aspect-[1.5] overflow-hidden rounded-lg border bg-white transition ${index === activeIndex ? "border-[#6c5ce7] ring-2 ring-[#6c5ce7]/25" : "border-[#dedfe6] opacity-70 hover:opacity-100"}`}
                key={preview.id}
                onClick={() => showPreview(index)}
                type="button"
              >
                <Image
                  alt={preview.altText ?? `${title} preview ${index + 1}`}
                  className="object-cover"
                  fill
                  sizes="(max-width: 640px) 25vw, 15vw"
                  src={preview.thumbUrl ?? preview.imageUrl}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxOpen && activePreview && (
        <div
          aria-label={`${title} image viewer`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090df2] p-4 sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget) setLightboxOpen(false);
          }}
          role="dialog"
        >
          <button
            aria-label="Close image viewer"
            className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            onClick={() => setLightboxOpen(false)}
            type="button"
          >
            <X size={21} />
          </button>

          {hasMultiple && (
            <>
              <button
                aria-label="Previous preview"
                className="absolute left-3 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-8"
                onClick={() => showPreview(activeIndex - 1)}
                type="button"
              >
                <ChevronLeft size={23} />
              </button>
              <button
                aria-label="Next preview"
                className="absolute right-3 z-20 grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-8"
                onClick={() => showPreview(activeIndex + 1)}
                type="button"
              >
                <ChevronRight size={23} />
              </button>
            </>
          )}

          <div className="relative h-[78vh] w-full max-w-6xl">
            <Image
              alt={activePreview.altText ?? title}
              className="object-contain"
              fill
              priority
              sizes="100vw"
              src={activePreview.imageUrl}
            />
          </div>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-center text-xs text-white/85">
            <span className="font-semibold">{title}</span>
            {hasMultiple && <span className="ml-3 font-mono text-white/60">{activeIndex + 1} / {previews.length}</span>}
          </div>
        </div>
      )}
    </>
  );
}
