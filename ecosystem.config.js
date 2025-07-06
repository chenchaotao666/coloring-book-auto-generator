module.exports = {
  apps: [
    {
      name: 'coloring-book-backend',
      script: 'server.js',
      cwd: './backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      error_file: './backend/logs/backend-err.log',
      out_file: './backend/logs/backend-out.log',
      log_file: './backend/logs/backend-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000
    },
    {
      name: 'coloring-book-frontend',
      script: 'serve',
      args: '-s dist -l 3000',
      cwd: './frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './frontend/logs/frontend-err.log',
      out_file: './frontend/logs/frontend-out.log',
      log_file: './frontend/logs/frontend-combined.log',
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
      'post-deploy': 'cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
} 