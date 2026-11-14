"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";

type ArchiveDescriptor = {
  storageProvider: "local" | "s3";
  storageKey: string;
  originalName: string;
  mimeType: "application/zip";
  size: number;
  sha256: string;
};

type HostedPreview = {
  name: string;
  imageUrl: string;
  backupUrl: string | null;
  thumbUrl: string | null;
};

type WorkerResult = {
  sha256?: string;
  blob?: Blob;
  name?: string;
  type?: string;
};

function createMediaWorker() {
  const worker = new Worker("/media-worker.js");
  let nextId = 0;
  const pending = new Map<
    number,
    { resolve: (value: WorkerResult) => void; reject: (reason: Error) => void }
  >();

  worker.onmessage = (event: MessageEvent<{ id: number; result?: WorkerResult; error?: string }>) => {
    const request = pending.get(event.data.id);
    if (!request) return;
    pending.delete(event.data.id);
    if (event.data.error) request.reject(new Error(event.data.error));
    else request.resolve(event.data.result ?? {});
  };
  worker.onerror = () => {
    for (const request of pending.values()) request.reject(new Error("Media worker failed."));
    pending.clear();
  };

  return {
    request(operation: "hash" | "compress", file: File) {
      const id = nextId;
      nextId += 1;
      return new Promise<WorkerResult>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, operation, file });
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}

function uploadWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Object storage upload failed (HTTP ${request.status}).`));
    };
    request.onerror = () => reject(new Error("Could not reach object storage."));
    request.send(file);
  });
}

async function responseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed (HTTP ${response.status}).`);
  return payload;
}

export function UploadResourceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [archiveName, setArchiveName] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  async function submit(formData: FormData) {
    const archive = formData.get("archive");
    const previewFiles = formData
      .getAll("previews")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!(archive instanceof File) || !archive.size) {
      setMessage({ type: "error", text: "Hãy chọn một file ZIP." });
      return;
    }
    if (previewFiles.length > 8) {
      setMessage({ type: "error", text: "Chỉ được chọn tối đa 8 ảnh preview." });
      return;
    }

    setBusy(true);
    setMessage(null);
    const processor = createMediaWorker();
    let completedArchive: ArchiveDescriptor | null = null;
    try {
      setProgress("Browser đang tính SHA-256 của ZIP...");
      const hashResult = await processor.request("hash", archive);
      if (!hashResult.sha256) throw new Error("Browser could not hash the archive.");

      const prepareResponse = await fetch("/api/uploads/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalName: archive.name,
          mimeType: archive.type || "application/zip",
          size: archive.size,
          sha256: hashResult.sha256,
        }),
      });
      const prepared = await responseJson<
        | {
            strategy: "direct";
            archive: ArchiveDescriptor;
            uploadUrl: string;
            headers: Record<string, string>;
          }
        | { strategy: "proxy"; uploadUrl: string }
      >(prepareResponse);

      const archiveUpload = (async (): Promise<ArchiveDescriptor> => {
        if (prepared.strategy === "direct") {
          setProgress("Đang upload ZIP trực tiếp lên object storage: 0%");
          await uploadWithProgress(prepared.uploadUrl, archive, prepared.headers, (percent) => {
            setProgress(`Đang upload ZIP trực tiếp lên object storage: ${percent}%`);
          });
          completedArchive = prepared.archive;
          return prepared.archive;
        }

        setProgress("Đang upload ZIP qua server local (development fallback)...");
        const localForm = new FormData();
        localForm.append("archive", archive);
        localForm.append("sha256", hashResult.sha256!);
        const response = await fetch(prepared.uploadUrl, { method: "POST", body: localForm });
        const stored = (await responseJson<{ archive: ArchiveDescriptor }>(response)).archive;
        completedArchive = stored;
        return stored;
      })();

      const previewUpload = (async (): Promise<HostedPreview[]> => {
        if (!previewFiles.length) return [];
        setProgress("Browser đang resize và nén ảnh preview...");
        const optimized: File[] = [];
        for (const file of previewFiles) {
          try {
            const result = await processor.request("compress", file);
            const blob = result.blob ?? file;
            optimized.push(
              new File([blob], result.name ?? file.name, {
                type: result.type || blob.type || file.type,
              }),
            );
          } catch {
            optimized.push(file);
          }
        }

        setProgress("Đang gửi các preview đã tối ưu tới Pixhost...");
        const previewForm = new FormData();
        for (const file of optimized) previewForm.append("previews", file);
        const response = await fetch("/api/uploads/previews", {
          method: "POST",
          body: previewForm,
        });
        return (await responseJson<{ previews: HostedPreview[] }>(response)).previews;
      })();

      const [archiveResult, previewResult] = await Promise.allSettled([
        archiveUpload,
        previewUpload,
      ]);
      if (archiveResult.status === "rejected") throw archiveResult.reason;
      if (previewResult.status === "rejected") throw previewResult.reason;
      const storedArchive = archiveResult.value;
      const hostedPreviews = previewResult.value;

      setProgress("Đang lưu metadata và quyền truy cập...");
      const createResponse = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          version: formData.get("version") || undefined,
          status: formData.get("status"),
          description: formData.get("description") || undefined,
          accessLevel: formData.get("accessLevel"),
          archive: storedArchive,
          previews: hostedPreviews,
        }),
      });
      await responseJson(createResponse);
      completedArchive = null;

      formRef.current?.reset();
      setArchiveName("");
      setPreviewCount(0);
      setProgress("");
      setMessage({ type: "success", text: "Resource đã được tạo thành công." });
      router.refresh();
    } catch (error) {
      if (completedArchive) {
        void fetch("/api/uploads/archive", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(completedArchive),
          keepalive: true,
        });
      }
      setProgress("");
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Upload failed.",
      });
    } finally {
      processor.terminate();
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="grid gap-4" ref={formRef}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-pine sm:col-span-2">
          Tên tài nguyên
          <input className="rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-moss" maxLength={180} name="title" placeholder="Ví dụ: Botanical UI Kit" required />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Phiên bản
          <input className="rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-moss" maxLength={40} name="version" placeholder="2.4.0" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Trạng thái
          <select className="rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none focus:border-moss" defaultValue="draft" name="status"><option value="draft">Bản nháp</option><option value="published">Xuất bản</option></select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine sm:col-span-2">
          Mô tả
          <textarea className="min-h-24 rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none placeholder:text-muted/60 focus:border-moss" maxLength={5000} name="description" placeholder="Nội dung và mục đích của resource..." />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Quyền truy cập
          <select className="rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none focus:border-moss" defaultValue="restricted" name="accessLevel"><option value="restricted">Chỉ email được cấp quyền</option><option value="authenticated">Mọi thành viên đăng nhập</option><option value="public">Public</option></select>
        </label>
        <label className="group grid cursor-pointer gap-1.5 text-xs font-medium text-pine">
          File ZIP
          <span className="flex min-h-12 items-center gap-2 truncate rounded-xl border border-dashed border-moss/55 bg-moss/5 px-3.5 text-muted group-hover:bg-moss/10"><UploadCloud className="shrink-0" size={16} /> {archiveName || "Chọn archive"}</span>
          <input accept=".zip,application/zip" className="sr-only" name="archive" onChange={(event) => setArchiveName(event.target.files?.[0]?.name ?? "")} required type="file" />
        </label>
        <label className="group grid cursor-pointer gap-1.5 text-xs font-medium text-pine sm:col-span-2">
          Ảnh preview (tối đa 8)
          <span className="flex min-h-14 items-center gap-2 rounded-xl border border-dashed border-clay/45 bg-clay/5 px-3.5 text-muted group-hover:bg-clay/10"><ImagePlus size={16} /> {previewCount ? `${previewCount} ảnh đã chọn · browser sẽ tự nén` : "Chọn JPG, PNG, WebP hoặc GIF"}</span>
          <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" multiple name="previews" onChange={(event) => setPreviewCount(event.target.files?.length ?? 0)} type="file" />
        </label>
      </div>
      {progress && <p className="flex items-center gap-2 rounded-xl bg-pine/5 px-3 py-2.5 text-xs text-pine" role="status"><LoaderCircle className="animate-spin" size={14} /> {progress}</p>}
      {message && <p className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`} role="status">{message.type === "error" ? <X size={14} /> : <Check size={14} />} {message.text}</p>}
      <button className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-pine px-4 text-sm font-semibold text-white hover:bg-[#214a37] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <UploadCloud size={16} />}{busy ? "Đang xử lý..." : "Tạo resource"}</button>
    </form>
  );
}

export function PermissionManager({
  resourceId,
  initialEmails,
}: {
  resourceId: string;
  initialEmails: string[];
}) {
  const [emails, setEmails] = useState(initialEmails);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mutate(method: "POST" | "DELETE", targetEmail: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/resources/${resourceId}/permissions`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update access.");
      if (method === "POST") {
        const normalized = targetEmail.trim().toLowerCase();
        setEmails((current) => Array.from(new Set([...current, normalized])));
        setEmail("");
      } else {
        setEmails((current) => current.filter((value) => value !== targetEmail));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update access.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-line px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"><KeyRound size={13} /> Quyền download</div>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (email) void mutate("POST", email); }}>
        <input className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs outline-none focus:border-moss" onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" type="email" value={email} />
        <button className="rounded-lg bg-pine px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={busy || !email} type="submit">Cấp quyền</button>
      </form>
      {error && <p className="mt-2 text-[11px] text-red-700">{error}</p>}
      {emails.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{emails.map((value) => <span className="inline-flex items-center gap-1 rounded-full bg-pine/5 py-1 pl-2.5 pr-1 text-[10px] text-pine" key={value}>{value}<button aria-label={`Thu hồi quyền ${value}`} className="grid size-5 place-items-center rounded-full hover:bg-red-100 hover:text-red-700" disabled={busy} onClick={() => void mutate("DELETE", value)} type="button"><X size={11} /></button></span>)}</div>}
    </div>
  );
}
