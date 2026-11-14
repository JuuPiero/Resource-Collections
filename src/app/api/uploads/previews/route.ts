import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/authz";
import { uploadToPixhost } from "@/lib/pixhost";

export const runtime = "nodejs";
export const maxDuration = 120;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function concurrentMap<T, R>(values: T[], limit: number, mapper: (value: T, index: number) => Promise<R>) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(values[index], index);
      }
    }),
  );
  return results;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const previews = form
      .getAll("previews")
      .filter((value): value is File => value instanceof File && value.size > 0);
    if (!previews.length || previews.length > 8) {
      return Response.json({ error: "Upload between 1 and 8 preview images." }, { status: 400 });
    }
    for (const preview of previews) {
      if (!imageTypes.has(preview.type) || preview.size > 8 * 1024 * 1024) {
        return Response.json(
          { error: `Unsupported or oversized processed preview: ${preview.name}` },
          { status: 400 },
        );
      }
    }

    const hosted = await concurrentMap(previews, 3, async (preview) => ({
      name: preview.name,
      ...(await uploadToPixhost(
        preview.name,
        preview.type,
        new Uint8Array(await preview.arrayBuffer()),
      )),
    }));
    return Response.json({ previews: hosted });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Preview upload failed." },
      { status: 502 },
    );
  }
}
