import "server-only";

import { availableParallelism } from "node:os";
import { resolve } from "node:path";
import Piscina from "piscina";

type CpuPoolGlobal = typeof globalThis & { arcwellCpuPool?: Piscina };
const cpuPoolGlobal = globalThis as CpuPoolGlobal;

function getWorkerCount() {
  const configured = Number(process.env.CPU_WORKER_THREADS);
  if (Number.isSafeInteger(configured) && configured > 0) {
    return Math.min(configured, 16);
  }
  if (process.env.NODE_APP_INSTANCE !== undefined) return 1;
  return Math.max(1, Math.min(4, availableParallelism() - 1));
}

function getCpuPool() {
  if (cpuPoolGlobal.arcwellCpuPool) return cpuPoolGlobal.arcwellCpuPool;
  const maxThreads = getWorkerCount();
  const pool = new Piscina({
    filename: resolve(process.cwd(), "server-workers", "hash-file.mjs"),
    minThreads: 0,
    maxThreads,
    maxQueue: maxThreads * 8,
    idleTimeout: 30_000,
  });
  cpuPoolGlobal.arcwellCpuPool = pool;
  return pool;
}

export function hashFileInWorker(filename: string) {
  return getCpuPool().run({ filename }) as Promise<string>;
}
