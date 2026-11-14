self.onmessage = async (event) => {
  const { id, operation, file, maxDimension = 1800, quality = 0.82 } = event.data;
  try {
    if (operation === "hash") {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const sha256 = Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      self.postMessage({ id, result: { sha256 } });
      return;
    }

    if (operation === "compress") {
      if (file.type === "image/gif" || typeof OffscreenCanvas === "undefined") {
        self.postMessage({
          id,
          result: { blob: file, name: file.name, type: file.type },
        });
        return;
      }

      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const converted = await canvas.convertToBlob({ type: "image/webp", quality });
      const useOriginal = converted.size >= file.size && scale === 1;
      const blob = useOriginal ? file : converted;
      const name = useOriginal
        ? file.name
        : `${file.name.replace(/\.[^.]+$/, "") || "preview"}.webp`;
      self.postMessage({
        id,
        result: { blob, name, type: blob.type, width, height },
      });
      return;
    }

    throw new Error("Unknown media operation.");
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Worker operation failed.",
    });
  }
};
