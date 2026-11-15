const instances = Number(process.env.WEB_CONCURRENCY ?? "2");
if (!Number.isSafeInteger(instances) || instances < 1) {
  throw new Error("WEB_CONCURRENCY must be a positive integer.");
}

module.exports = {
  apps: [
    {
      name: "resource-collections",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      exec_mode: "cluster",
      instances,
      max_memory_restart: process.env.WEB_MAX_MEMORY ?? "768M",
      kill_timeout: 10_000,
      merge_logs: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
