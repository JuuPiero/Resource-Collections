import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export default async function hashFile({ filename }) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}
