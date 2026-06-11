module.exports = {
  apps: [
    {
      name: 'recharge-rehab',
      script: 'serve',
      args: '-s dist -l 3000 --no-clipboard',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 5173,
        PM2_SERVE_SPA: 'true',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
