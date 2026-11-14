import "server-only";

import { load } from "cheerio";

export type PixhostResult = {
  imageUrl: string;
  backupUrl: string | null;
  thumbUrl: string | null;
};

const UPLOAD_ENDPOINT = "https://api.pixhost.to/images";
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1_500, 4_000];

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function directFromThumb(thumbUrl: string | undefined) {
  const match = thumbUrl?.match(/^https:\/\/t(\d+)\.pixhost\.to\/thumbs\/(.+)$/);
  return match ? `https://img${match[1]}.pixhost.to/images/${match[2]}` : null;
}

async function uploadAttempt(name: string, mimeType: string, bytes: Uint8Array) {
  const form = new FormData();
  const imageBytes = Uint8Array.from(bytes);
  form.append(
    "img",
    new Blob([imageBytes.buffer as ArrayBuffer], { type: mimeType }),
    name,
  );
  form.append("content_type", "1");
  form.append("max_th_size", "420");

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    const snippet = (await response.text().catch(() => ""))
      .replace(/\s+/g, " ")
      .slice(0, 120);
    throw new Error(
      `Pixhost upload failed (HTTP ${response.status})${snippet ? `: ${snippet}` : ""}`,
    );
  }

  const payload = (await response.json()) as {
    show_url?: string;
    th_url?: string;
  };
  if (!payload.show_url) throw new Error("Pixhost did not return an image page.");
  return payload as { show_url: string; th_url?: string };
}

async function uploadOnce(name: string, mimeType: string, bytes: Uint8Array) {
  let payload: { show_url: string; th_url?: string } | null = null;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS && !payload; attempt += 1) {
    try {
      payload = await uploadAttempt(name, mimeType, bytes);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS - 1) await sleep(BACKOFF_MS[attempt]);
    }
  }
  if (!payload) {
    throw lastError instanceof Error ? lastError : new Error("Pixhost upload failed.");
  }

  const derived = directFromThumb(payload.th_url);
  if (derived) return { directUrl: derived, thumbUrl: payload.th_url ?? null };

  const page = await fetch(payload.show_url, {
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!page?.ok) {
    return { directUrl: payload.th_url ?? null, thumbUrl: payload.th_url ?? null };
  }

  const $ = load(await page.text());
  return {
    directUrl: $("#image").attr("src") ?? payload.th_url ?? null,
    thumbUrl: payload.th_url ?? null,
  };
}

export async function uploadToPixhost(
  name: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<PixhostResult> {
  const [primary, backup] = await Promise.allSettled([
    uploadOnce(name, mimeType, bytes),
    uploadOnce(name, mimeType, bytes),
  ]);
  const primaryValue = primary.status === "fulfilled" ? primary.value : null;
  const backupValue = backup.status === "fulfilled" ? backup.value : null;
  const selected = primaryValue ?? backupValue;
  if (!selected?.directUrl) {
    const reason = primary.status === "rejected" ? primary.reason : null;
    throw reason instanceof Error ? reason : new Error("Pixhost upload failed.");
  }

  return {
    imageUrl: selected.directUrl,
    backupUrl:
      primaryValue?.directUrl && backupValue?.directUrl
        ? backupValue.directUrl
        : null,
    thumbUrl: selected.thumbUrl,
  };
}
