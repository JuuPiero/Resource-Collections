"use client";

import { type DragEvent, type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ImagePlus,
  KeyRound,
  LoaderCircle,
  Pencil,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { ResourceListItem } from "@/lib/resources";

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

const archiveTypes = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);
const previewTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const previewExtensions = /\.(jpe?g|png|webp|gif)$/i;

function isArchiveFile(file: File) {
  return (
    file.name.toLowerCase().endsWith(".zip") &&
    (!file.type || archiveTypes.has(file.type))
  );
}

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

async function uploadArchive(
  archive: File,
  processor: ReturnType<typeof createMediaWorker>,
  setProgress: (progress: string) => void,
): Promise<ArchiveDescriptor> {
  setProgress("Calculating the archive SHA-256 in your browser...");
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

  if (prepared.strategy === "direct") {
    setProgress("Uploading ZIP directly to object storage: 0%");
    await uploadWithProgress(prepared.uploadUrl, archive, prepared.headers, (percent) => {
      setProgress(`Uploading ZIP directly to object storage: ${percent}%`);
    });
    return prepared.archive;
  }

  setProgress("Uploading ZIP through the local development server...");
  const localForm = new FormData();
  localForm.append("archive", archive);
  localForm.append("sha256", hashResult.sha256);
  const response = await fetch(prepared.uploadUrl, { method: "POST", body: localForm });
  return (await responseJson<{ archive: ArchiveDescriptor }>(response)).archive;
}

async function uploadPreviews(
  files: File[],
  processor: ReturnType<typeof createMediaWorker>,
  setProgress: (progress: string) => void,
): Promise<HostedPreview[]> {
  if (!files.length) return [];

  setProgress("Resizing and compressing preview images in your browser...");
  const optimized: File[] = [];
  for (const file of files) {
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

  setProgress("Uploading optimized previews to Pixhost...");
  const previewForm = new FormData();
  for (const file of optimized) previewForm.append("previews", file);
  const response = await fetch("/api/uploads/previews", {
    method: "POST",
    body: previewForm,
  });
  return (await responseJson<{ previews: HostedPreview[] }>(response)).previews;
}

export function UploadResourceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [archiveName, setArchiveName] = useState("");
  const [previewCount, setPreviewCount] = useState(0);
  const [draggingArchive, setDraggingArchive] = useState(false);
  const [draggingPreviews, setDraggingPreviews] = useState(false);
  const [progress, setProgress] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  function selectArchive(files: FileList | File[]) {
    const archive = files[0];
    if (!archive) return;
    if (
      !archive.name.toLowerCase().endsWith(".zip") ||
      (archive.type && !["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(archive.type))
    ) {
      setMessage({ type: "error", text: "Choose a ZIP archive." });
      return;
    }
    if (archiveInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(archive);
      archiveInputRef.current.files = transfer.files;
    }
    setArchiveName(archive.name);
    setMessage(null);
  }

  function selectPreviews(files: FileList | File[]) {
    const selected = Array.from(files);
    const validTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const validExtensions = /\.(jpe?g|png|webp|gif)$/i;
    if (selected.length > 8) {
      setMessage({ type: "error", text: "Select no more than 8 preview images." });
      return;
    }
    if (
      selected.some(
        (file) =>
          (file.type && !validTypes.has(file.type)) ||
          (!file.type && !validExtensions.test(file.name)),
      )
    ) {
      setMessage({ type: "error", text: "Choose JPG, PNG, WebP, or GIF images." });
      return;
    }
    if (previewInputRef.current) {
      const transfer = new DataTransfer();
      selected.forEach((file) => transfer.items.add(file));
      previewInputRef.current.files = transfer.files;
    }
    setPreviewCount(selected.length);
    setMessage(null);
  }

  function handleDrop(
    event: DragEvent<HTMLLabelElement>,
    selectFiles: (files: FileList) => void,
    setDragging: (dragging: boolean) => void,
  ) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) selectFiles(event.dataTransfer.files);
  }

  async function submit(formData: FormData) {
    const archive = formData.get("archive");
    const previewFiles = formData
      .getAll("previews")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!(archive instanceof File) || !archive.size) {
      setMessage({ type: "error", text: "Choose a ZIP archive." });
      return;
    }
    if (previewFiles.length > 8) {
      setMessage({ type: "error", text: "Select no more than 8 preview images." });
      return;
    }

    setBusy(true);
    setMessage(null);
    const processor = createMediaWorker();
    let completedArchive: ArchiveDescriptor | null = null;
    try {
      const archiveUpload = uploadArchive(archive, processor, setProgress).then((stored) => {
        completedArchive = stored;
        return stored;
      });
      const previewUpload = uploadPreviews(previewFiles, processor, setProgress);

      const [archiveResult, previewResult] = await Promise.allSettled([
        archiveUpload,
        previewUpload,
      ]);
      if (archiveResult.status === "rejected") throw archiveResult.reason;
      if (previewResult.status === "rejected") throw previewResult.reason;
      const storedArchive = archiveResult.value;
      const hostedPreviews = previewResult.value;

      setProgress("Saving resource details and access permissions...");
      const createResponse = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          version: formData.get("version") || undefined,
          category: formData.get("category"),
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
      setMessage({ type: "success", text: "Resource created successfully." });
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
          Resource name
          <input className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-pine" maxLength={180} name="title" placeholder="e.g. Botanical UI Kit" required />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Version
          <input className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-pine" maxLength={40} name="version" placeholder="2.4.0" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Category
          <select className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-pine" defaultValue="tools" name="category">
            <option value="3d">3D Assets</option>
            <option value="2d">2D Assets</option>
            <option value="audio">Audio</option>
            <option value="tools">Tools</option>
            <option value="templates">Templates</option>
            <option value="addons">Add-ons</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Status
          <select className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-pine" defaultValue="draft" name="status"><option value="draft">Draft</option><option value="published">Published</option></select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine sm:col-span-2">
          Description
          <textarea className="min-h-24 rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-pine" maxLength={5000} name="description" placeholder="What is included in this resource?" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-pine">
          Access level
          <select className="rounded-xl border border-line bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-pine" defaultValue="restricted" name="accessLevel"><option value="restricted">Invited emails only</option><option value="authenticated">Any signed-in member</option><option value="public">Public</option></select>
        </label>
        <label
          className="group grid cursor-pointer gap-1.5 text-xs font-medium text-pine"
          onDragEnter={(event) => { event.preventDefault(); setDraggingArchive(true); }}
          onDragLeave={(event) => { event.preventDefault(); setDraggingArchive(false); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, selectArchive, setDraggingArchive)}
        >
          ZIP archive
          <span className={`flex min-h-12 items-center gap-2 truncate rounded-xl border border-dashed px-3.5 text-muted group-hover:bg-moss/10 ${draggingArchive ? "border-pine bg-pine/10" : "border-moss/55 bg-moss/5"}`}><UploadCloud className="shrink-0" size={16} /> {archiveName || "Choose or drop a ZIP archive"}</span>
          <input accept=".zip,application/zip" className="sr-only" name="archive" onChange={(event) => selectArchive(event.target.files ?? [])} ref={archiveInputRef} required type="file" />
        </label>
        <label
          className="group grid cursor-pointer gap-1.5 text-xs font-medium text-pine sm:col-span-2"
          onDragEnter={(event) => { event.preventDefault(); setDraggingPreviews(true); }}
          onDragLeave={(event) => { event.preventDefault(); setDraggingPreviews(false); }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, selectPreviews, setDraggingPreviews)}
        >
          Preview images (up to 8)
          <span className={`flex min-h-14 items-center gap-2 rounded-xl border border-dashed px-3.5 text-muted group-hover:bg-clay/10 ${draggingPreviews ? "border-pine bg-pine/10" : "border-clay/45 bg-clay/5"}`}><ImagePlus size={16} /> {previewCount ? `${previewCount} selected · optimized in your browser` : "Choose or drop JPG, PNG, WebP, or GIF files"}</span>
          <input accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" multiple name="previews" onChange={(event) => selectPreviews(event.target.files ?? [])} ref={previewInputRef} type="file" />
        </label>
      </div>
      {progress && <p className="flex items-center gap-2 rounded-xl bg-pine/5 px-3 py-2.5 text-xs text-pine" role="status"><LoaderCircle className="animate-spin" size={14} /> {progress}</p>}
      {message && <p className={`flex items-center gap-2 border px-3 py-2.5 text-xs ${message.type === "error" ? "border-clay/40 bg-clay/10 text-clay" : "border-pine/40 bg-pine/10 text-pine"}`} role="status">{message.type === "error" ? <X size={14} /> : <Check size={14} />} {message.text}</p>}
      <button className="mt-1 inline-flex h-11 items-center justify-center gap-2 border border-pine bg-pine px-4 font-mono text-xs font-bold uppercase tracking-wider text-background hover:bg-[#d8ff9b] disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <UploadCloud size={16} />}{busy ? "Processing..." : "Create resource"}</button>
    </form>
  );
}

export function ResourceManager({
  item,
  defaultOpen = false,
  onSaved,
  onDeleted,
}: {
  item: ResourceListItem;
  defaultOpen?: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const archiveInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");
  const [archiveName, setArchiveName] = useState("");
  const [previewNames, setPreviewNames] = useState<string[]>([]);
  const [draggingArchive, setDraggingArchive] = useState(false);
  const [draggingPreviews, setDraggingPreviews] = useState(false);

  function selectReplacementArchive(files: FileList | File[]) {
    const archive = files[0];
    if (!archive) return;
    if (!isArchiveFile(archive)) {
      if (archiveInputRef.current) archiveInputRef.current.value = "";
      setArchiveName("");
      setMessage("Choose a ZIP archive.");
      return;
    }
    if (archiveInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(archive);
      archiveInputRef.current.files = transfer.files;
    }
    setArchiveName(archive.name);
    setMessage("");
  }

  function selectReplacementPreviews(files: FileList | File[]) {
    const selected = Array.from(files);
    if (selected.length > 8) {
      if (previewInputRef.current) previewInputRef.current.value = "";
      setPreviewNames([]);
      setMessage("Select no more than 8 preview images.");
      return;
    }
    if (
      selected.some(
        (file) =>
          (file.type && !previewTypes.has(file.type)) ||
          (!file.type && !previewExtensions.test(file.name)),
      )
    ) {
      if (previewInputRef.current) previewInputRef.current.value = "";
      setPreviewNames([]);
      setMessage("Choose JPG, PNG, WebP, or GIF images.");
      return;
    }
    if (previewInputRef.current) {
      const transfer = new DataTransfer();
      selected.forEach((file) => transfer.items.add(file));
      previewInputRef.current.files = transfer.files;
    }
    setPreviewNames(selected.map((file) => file.name));
    setMessage("");
  }

  function handleReplacementDrop(
    event: DragEvent<HTMLLabelElement>,
    selectFiles: (files: FileList) => void,
    setDragging: (dragging: boolean) => void,
  ) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) selectFiles(event.dataTransfer.files);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const archiveValue = formData.get("archive");
    const archive =
      archiveValue instanceof File && archiveValue.size > 0 ? archiveValue : null;
    const previewFiles = formData
      .getAll("previews")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (archive && !isArchiveFile(archive)) {
      setMessage("Choose a ZIP archive.");
      return;
    }
    if (previewFiles.length > 8) {
      setMessage("Select no more than 8 preview images.");
      return;
    }
    if (
      previewFiles.some(
        (file) =>
          (file.type && !previewTypes.has(file.type)) ||
          (!file.type && !previewExtensions.test(file.name)),
      )
    ) {
      setMessage("Choose JPG, PNG, WebP, or GIF images.");
      return;
    }

    setBusy(true);
    setMessage("");
    setProgress("");
    const processor = archive || previewFiles.length ? createMediaWorker() : null;
    let uploadedArchive: ArchiveDescriptor | null = null;
    let cleanupUploadedArchive = true;
    try {
      const archiveUpload = archive && processor
        ? uploadArchive(archive, processor, setProgress).then((stored) => {
            uploadedArchive = stored;
            return stored;
          })
        : Promise.resolve(undefined);
      const previewUpload = previewFiles.length && processor
        ? uploadPreviews(previewFiles, processor, setProgress)
        : Promise.resolve(undefined);
      const [archiveResult, previewResult] = await Promise.allSettled([
        archiveUpload,
        previewUpload,
      ]);
      if (archiveResult.status === "rejected") throw archiveResult.reason;
      if (previewResult.status === "rejected") throw previewResult.reason;

      setProgress("Saving resource details and replacing selected files...");
      cleanupUploadedArchive = false;
      const response = await fetch(`/api/resources/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          description: formData.get("description"),
          version: formData.get("version"),
          category: formData.get("category"),
          status: formData.get("status"),
          accessLevel: formData.get("accessLevel"),
          ...(archiveResult.value ? { archive: archiveResult.value } : {}),
          ...(previewResult.value ? { previews: previewResult.value } : {}),
        }),
      });
      if (!response.ok) {
        cleanupUploadedArchive = true;
      }
      const payload = await responseJson<{ warning?: string }>(response);
      uploadedArchive = null;
      if (payload.warning) window.alert(payload.warning);
      setProgress("");
      setMessage("Resource updated.");
      router.refresh();
      onSaved?.();
    } catch (error) {
      let errorMessage =
        error instanceof Error ? error.message : "Could not update resource.";
      if (uploadedArchive && cleanupUploadedArchive) {
        try {
          await responseJson(
            await fetch("/api/uploads/archive", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(uploadedArchive),
            }),
          );
        } catch (cleanupError) {
          const cleanupMessage =
            cleanupError instanceof Error
              ? cleanupError.message
              : "Could not clean up the uploaded ZIP.";
          errorMessage = `${errorMessage} ${cleanupMessage}`;
        }
      }
      setProgress("");
      setMessage(errorMessage);
    } finally {
      processor?.terminate();
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.title}" and its ZIP archive? This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/resources/${item.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string; warning?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete resource.");
      if (payload.warning) window.alert(payload.warning);
      router.refresh();
      onDeleted?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete resource.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-white/8 p-4">
      <details open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-bold text-[#a99eff] hover:text-white">
          <Pencil size={13} /> Edit resource details
        </summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={save}>
          <label className="grid gap-1 text-[10px] text-white/55 sm:col-span-2">
            Name
            <input className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.title} maxLength={180} name="title" minLength={2} required />
          </label>
          <label className="grid gap-1 text-[10px] text-white/55">
            Version
            <input className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.version ?? ""} maxLength={40} name="version" />
          </label>
          <label className="grid gap-1 text-[10px] text-white/55">
            Category
            <select className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.category} name="category">
              <option value="3d">3D Assets</option><option value="2d">2D Assets</option><option value="audio">Audio</option><option value="tools">Tools</option><option value="templates">Templates</option><option value="addons">Add-ons</option><option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-1 text-[10px] text-white/55">
            Status
            <select className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.status} name="status"><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select>
          </label>
          <label className="grid gap-1 text-[10px] text-white/55">
            Access
            <select className="rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.accessLevel} name="accessLevel"><option value="restricted">Invited emails only</option><option value="authenticated">Any signed-in member</option><option value="public">Public</option></select>
          </label>
          <label className="grid gap-1 text-[10px] text-white/55 sm:col-span-2">
            Description
            <textarea className="min-h-20 rounded-md border border-white/10 bg-[#111318] px-3 py-2 text-xs text-white" defaultValue={item.description ?? ""} maxLength={5000} name="description" />
          </label>
          <label
            className={`group grid cursor-pointer gap-1.5 rounded-md border border-dashed p-3 text-[10px] text-white/55 transition-colors sm:col-span-2 ${draggingArchive ? "border-[#a99eff] bg-[#6c5ce7]/10" : "border-white/10 hover:bg-white/[.025]"}`}
            onDragLeave={() => setDraggingArchive(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDraggingArchive(true);
            }}
            onDrop={(event) =>
              handleReplacementDrop(event, selectReplacementArchive, setDraggingArchive)
            }
          >
            Replace ZIP archive (optional)
            <span className="text-[9px] text-white/40">
              {item.file
                ? `Current: ${item.file.originalName} · ${item.file.size.toLocaleString()} bytes`
                : "No ZIP is currently attached."}
            </span>
            <span className="flex min-h-10 items-center gap-2 rounded-md bg-[#111318] px-3 text-white/65">
              <UploadCloud size={14} />
              {archiveName || "Choose or drop a ZIP. Leave empty to keep the current file."}
            </span>
            <input
              accept=".zip,application/zip"
              className="sr-only"
              disabled={busy}
              name="archive"
              onChange={(event) => selectReplacementArchive(event.target.files ?? [])}
              ref={archiveInputRef}
              type="file"
            />
          </label>
          <label
            className={`group grid cursor-pointer gap-1.5 rounded-md border border-dashed p-3 text-[10px] text-white/55 transition-colors sm:col-span-2 ${draggingPreviews ? "border-[#a99eff] bg-[#6c5ce7]/10" : "border-white/10 hover:bg-white/[.025]"}`}
            onDragLeave={() => setDraggingPreviews(false)}
            onDragOver={(event) => {
              event.preventDefault();
              setDraggingPreviews(true);
            }}
            onDrop={(event) =>
              handleReplacementDrop(event, selectReplacementPreviews, setDraggingPreviews)
            }
          >
            Replace preview images (optional, up to 8)
            <span className="text-[9px] text-white/40">
              Current gallery: {item.previews.length} image{item.previews.length === 1 ? "" : "s"}.
              New images replace the entire gallery; leave empty to keep it.
            </span>
            <span className="flex min-h-10 items-center gap-2 rounded-md bg-[#111318] px-3 text-white/65">
              <ImagePlus size={14} />
              {previewNames.length
                ? `${previewNames.length} replacement image${previewNames.length === 1 ? "" : "s"} selected`
                : "Choose or drop JPG, PNG, WebP, or GIF files"}
            </span>
            <input
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={busy}
              multiple
              name="previews"
              onChange={(event) => selectReplacementPreviews(event.target.files ?? [])}
              ref={previewInputRef}
              type="file"
            />
          </label>
          {progress && (
            <p className="flex items-center gap-2 text-[10px] text-[#c5beff]" role="status">
              <LoaderCircle className="animate-spin" size={13} />
              {progress}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-md bg-[#6c5ce7] px-3 text-[10px] font-bold text-white disabled:opacity-50" disabled={busy} type="submit"><Save size={13} /> {busy ? "Saving..." : "Save changes"}</button>
            <button className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-400/30 px-3 text-[10px] font-bold text-rose-300 hover:bg-rose-400/10 disabled:opacity-50" disabled={busy} onClick={() => void remove()} type="button"><Trash2 size={13} /> Delete resource</button>
            {message && <span className="text-[10px] text-amber-200" role="status">{message}</span>}
          </div>
        </form>
      </details>
    </div>
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
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted"><KeyRound size={13} /> Download access</div>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (email) void mutate("POST", email); }}>
        <input className="min-w-0 flex-1 border border-line bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-pine" onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" type="email" value={email} />
        <button className="border border-pine bg-pine px-3 font-mono text-[10px] font-bold uppercase text-background disabled:opacity-50" disabled={busy || !email} type="submit">Grant access</button>
      </form>
      {error && <p className="mt-2 text-[11px] text-clay">{error}</p>}
      {emails.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{emails.map((value) => <span className="inline-flex items-center gap-1 border border-line bg-background py-1 pl-2.5 pr-1 font-mono text-[9px] text-pine" key={value}>{value}<button aria-label={`Revoke access for ${value}`} className="grid size-5 place-items-center text-muted hover:bg-clay/10 hover:text-clay" disabled={busy} onClick={() => void mutate("DELETE", value)} type="button"><X size={11} /></button></span>)}</div>}
    </div>
  );
}
