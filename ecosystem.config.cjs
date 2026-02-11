/**
 * PM2 config for backend on VPS.
 * Usage: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "sm-mki-api",
      script: "src/app.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
