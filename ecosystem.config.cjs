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
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
