import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password,
      salt,
      KEY_LENGTH,
      { N: 1 << 14, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => {
        if (error) reject(error);
        else resolve(key);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string | null | undefined,
) {
  if (!encodedHash) {
    await deriveKey(password, randomBytes(16));
    return false;
  }

  const [algorithm, saltHex, keyHex] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !saltHex ||
    !/^[a-f0-9]{32}$/i.test(saltHex) ||
    !keyHex ||
    !/^[a-f0-9]{128}$/i.test(keyHex)
  ) {
    await deriveKey(password, randomBytes(16));
    return false;
  }

  const expected = Buffer.from(keyHex, "hex");
  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(expected, actual);
}
