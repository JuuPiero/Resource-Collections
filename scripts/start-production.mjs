import { spawn, spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const migration = spawnSync(npmCommand, ["run", "db:migrate"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (migration.error || migration.status !== 0) {
  const reason = migration.error?.message ?? `exit code ${migration.status ?? "unknown"}`;
  console.error(
    `Database migration failed (${reason}). Starting the web server anyway; database-backed features will remain unavailable until the database and migrations are healthy.`,
  );
}

const server = spawn(npmCommand, ["run", "start:cluster"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}

server.on("error", (error) => {
  console.error("Could not start the production web server.", error);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
