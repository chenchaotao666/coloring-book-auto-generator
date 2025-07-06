module.exports = {
  apps: [
    {
      name: 'coloring-book-frontend',
      script: 'npx',
      args: 'serve -s dist -l 3001',
      cwd: './frontend',
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
      error_file: '/dev/null',
      out_file: '/dev/null',
      log_file: '/dev/null',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      merge_logs: true,
      // 进程管理配置
      min_uptime: '10s',
      max_restarts: 10,
      // 健康检查
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 3000,
      // 静态文件服务配置
      exec_mode: 'fork',
      // 集群模式配置（可选，静态文件服务通常不需要）
      // instances: 'max',
      // exec_mode: 'cluster'
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