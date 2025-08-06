module.exports = {
  apps: [
    {
      name: 'coloring-book-frontend',
      script: 'npx',
      args: 'serve -s dist -p 3001',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 3000,
      exec_mode: 'fork'
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/coloring-book-auto-generator.git',
      path: '/var/www/coloring-book',
      'pre-deploy-local': '',
      'post-deploy': 'cd frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
} 