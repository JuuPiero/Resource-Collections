"use client";

import Image from "next/image";
import { useState } from "react";
import { Boxes, Pencil, X } from "lucide-react";
import type { ResourceListItem } from "@/lib/resources";
import {
  PermissionManager,
  ResourceManager,
} from "@/components/admin-tools";

const categoryLabels: Record<string, string> = {
  "3d": "3D Assets",
  "2d": "2D Assets",
  audio: "Audio",
  tools: "Tools",
  templates: "Templates",
  addons: "Add-ons",
  other: "Other",
};

function formatBytes(value: number) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function AssetManagementTable({
  items,
}: {
  items: ResourceListItem[];
}) {
  const [selected, setSelected] = useState<ResourceListItem | null>(null);

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#191b24]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-sm font-bold">Asset catalog</h2>
            <p className="mt-1 text-[10px] text-white/40">{items.length} total resources</p>
          </div>
          <span className="rounded-full bg-[#6c5ce7]/15 px-3 py-1.5 text-[10px] font-semibold text-[#b9b0ff]">
            {items.filter((item) => item.status === "published").length} published
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead className="bg-white/[.025] text-[9px] uppercase tracking-[.13em] text-white/40">
              <tr>
                <th className="px-5 py-3 font-semibold">Resource</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Access</th>
                <th className="px-4 py-3 font-semibold">Archive</th>
                <th className="px-4 py-3 font-semibold">Licenses</th>
                <th className="px-5 py-3 text-right font-semibold">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {items.map((item) => {
                const preview = item.previews[0];
                return (
                  <tr className="text-xs text-white/70" key={item.id}>
                    <td className="px-5 py-4">
                      <div className="flex min-w-56 items-center gap-3">
                        <span className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#272a36] text-[#a99eff]">
                          {preview ? (
                            <Image
                              alt=""
                              className="object-cover"
                              fill
                              sizes="44px"
                              src={preview.thumbUrl ?? preview.imageUrl}
                            />
                          ) : (
                            <Boxes size={17} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate font-semibold text-white">{item.title}</strong>
                          <span className="mt-1 block text-[9px] text-white/40">{item.version ? `v${item.version}` : "No version"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[10px]">{categoryLabels[item.category] ?? "Other"}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${item.status === "published" ? "bg-emerald-400/10 text-emerald-300" : item.status === "archived" ? "bg-white/10 text-white/50" : "bg-amber-400/10 text-amber-300"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[10px] capitalize">{item.accessLevel}</td>
                    <td className="px-4 py-4 text-[10px]">{item.file ? formatBytes(item.file.size) : "No ZIP"}</td>
                    <td className="px-4 py-4 text-[10px]">{item.permissions.length}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-[10px] font-bold text-[#c5beff] hover:bg-white/5"
                        onClick={() => setSelected(item)}
                        type="button"
                      >
                        <Pencil size={12} /> Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!items.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-xs text-white/40" colSpan={7}>
                    No assets have been uploaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          aria-label={`Manage ${selected.title}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
          role="dialog"
        >
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/10 bg-[#191b24] p-5 text-white shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#a99eff]">Asset management</p>
                <h2 className="mt-2 text-xl font-bold">{selected.title}</h2>
              </div>
              <button
                aria-label="Close asset management"
                className="grid size-9 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/5 hover:text-white"
                onClick={() => setSelected(null)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>
            {selected.accessLevel === "restricted" && (
              <div className="mb-5 rounded-lg border border-white/8 bg-[#111318] [&_input]:rounded-md [&_button]:rounded-md">
                <PermissionManager
                  initialEmails={selected.permissions.map((permission) => permission.email)}
                  resourceId={selected.id}
                />
              </div>
            )}
            <ResourceManager
              defaultOpen
              item={selected}
              onDeleted={() => setSelected(null)}
              onSaved={() => setSelected(null)}
            />
          </section>
        </div>
      )}
    </>
  );
}
