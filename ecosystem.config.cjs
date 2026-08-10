module.exports = {
  apps: [
    {
      name: "move2026-peterpan-shortterm",
      script: "node_modules/.bin/vinext",
      args: "start -H 127.0.0.1 -p 3410",
      cwd: "/home/ubuntu/workspace/move2026-peterpan-shortterm",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_BASE_PATH: "/move2026",
        WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
      },
    },
  ],
};
