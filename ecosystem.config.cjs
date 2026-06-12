module.exports = {
  apps: [
    {
      // Single unified server: serves the built site (../dist) AND the /api,
      // both on the same origin/port, backed by Postgres. Reads DB creds +
      // ADMIN_TOKEN + PORT from server/.env (gitignored). PORT is 3000 in prod.
      name: 'recharge-api',
      script: 'index.js',
      cwd: './server',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
