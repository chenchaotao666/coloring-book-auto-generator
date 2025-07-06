# PM2 全栈部署指南

## 🚀 项目架构

本项目包含：
- **Backend**: Node.js + Express API服务器 (端口3002)
- **Frontend**: React + Vite静态网站 (端口3000)

## 📋 快速部署

### 1. 安装依赖

```bash
# 全局安装PM2
npm install -g pm2

# 安装项目依赖
npm run install:all
```

### 2. 构建项目

```bash
# 构建前后端
npm run build
```

### 3. 启动服务

```bash
# 生产环境启动
npm run pm2:start:prod

# 或者开发环境启动
npm run pm2:start
```

## 🔧 PM2命令详解

### 项目级别命令 (推荐)

```bash
# 启动所有服务
npm run pm2:start:prod

# 重启所有服务
npm run pm2:restart

# 停止所有服务
npm run pm2:stop

# 删除所有服务
npm run pm2:delete

# 查看日志
npm run pm2:logs

# 监控面板
npm run pm2:monit

# 查看状态
npm run pm2:status
```

### 单独管理前后端

```bash
# 后端服务
pm2 start coloring-book-backend
pm2 restart coloring-book-backend
pm2 stop coloring-book-backend

# 前端服务  
pm2 start coloring-book-frontend
pm2 restart coloring-book-frontend
pm2 stop coloring-book-frontend
```

### 构建和部署

```bash
# 完整部署流程
npm run deploy:setup  # 安装依赖 + 构建
npm run deploy:prod   # 构建 + 启动生产环境
```

## 📁 项目结构

```
coloring-book-auto-generator/
├── ecosystem.config.js          # 统一PM2配置
├── package.json                 # 根目录脚本
├── backend/
│   ├── ecosystem.config.js      # 后端PM2配置
│   ├── package.json             # 后端依赖和脚本
│   ├── server.js                # 后端入口文件
│   ├── logs/                    # 后端日志目录
│   └── .env                     # 后端环境配置
└── frontend/
    ├── ecosystem.config.js      # 前端PM2配置
    ├── package.json             # 前端依赖和脚本
    ├── dist/                    # 构建输出目录
    └── logs/                    # 前端日志目录
```

## ⚙️ 配置说明

### Backend配置 (Node.js API)
- **端口**: 3002
- **内存限制**: 1GB
- **服务类型**: API服务器
- **重启策略**: 自动重启

### Frontend配置 (Static Files)
- **端口**: 3000  
- **内存限制**: 500MB
- **服务类型**: 静态文件服务器 (serve)
- **重启策略**: 自动重启

## 🔍 监控和日志

### 查看服务状态

```bash
pm2 status
```

示例输出：
```
┌─────┬─────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name                    │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼─────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ coloring-book-backend   │ default     │ 1.0.0   │ fork    │ 12345    │ 2h     │ 0    │ online    │ 2%       │ 85.2mb   │ ubuntu   │ disabled │
│ 1   │ coloring-book-frontend  │ default     │ 0.0.0   │ fork    │ 12346    │ 2h     │ 0    │ online    │ 0%       │ 25.1mb   │ ubuntu   │ disabled │
└─────┴─────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### 日志文件位置

**Backend日志**:
- 错误日志: `backend/logs/backend-err.log`
- 输出日志: `backend/logs/backend-out.log`
- 合并日志: `backend/logs/backend-combined.log`

**Frontend日志**:
- 错误日志: `frontend/logs/frontend-err.log`
- 输出日志: `frontend/logs/frontend-out.log`
- 合并日志: `frontend/logs/frontend-combined.log`

### 实时日志查看

```bash
# 查看所有日志
pm2 logs

# 查看特定服务日志
pm2 logs coloring-book-backend
pm2 logs coloring-book-frontend

# 查看最近100行日志
pm2 logs --lines 100
```

## 🔄 部署流程

### Linux服务器部署

```bash
# 1. 克隆项目
git clone https://github.com/your-username/coloring-book-auto-generator.git
cd coloring-book-auto-generator

# 2. 安装依赖
npm run install:all

# 3. 配置环境变量
cd backend
cp .env.example .env
# 编辑.env文件配置数据库和API

# 4. 构建项目
cd ..
npm run build

# 5. 启动服务
npm run pm2:start:prod

# 6. 验证服务
npm run pm2:status
curl http://localhost:3002/api/health  # 测试后端
curl http://localhost:3000              # 测试前端
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建
npm run build

# 3. 重启服务
npm run pm2:restart
```

## 🛠️ 故障排除

### 常见问题

1. **Frontend启动失败**
```bash
# 检查dist目录是否存在
ls frontend/dist/

# 如果不存在，重新构建
cd frontend && npm run build
```

2. **Backend数据库连接失败**
```bash
# 测试数据库连接
cd backend && node test-db-connection.js

# 检查环境变量
cat backend/.env
```

3. **端口冲突**
```bash
# 检查端口占用
netstat -tlnp | grep :3000
netstat -tlnp | grep :3002

# 杀死占用进程
sudo kill -9 <pid>
```

4. **服务无法访问**
```bash
# 检查防火墙
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw allow 3002/tcp
```

### 日志调试

```bash
# 查看错误日志
pm2 logs coloring-book-backend --err
pm2 logs coloring-book-frontend --err

# 查看详细信息
pm2 show coloring-book-backend
pm2 show coloring-book-frontend
```

## 🔐 生产环境安全

### 1. 使用反向代理 (Nginx)

```nginx
# /etc/nginx/sites-available/coloring-book
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React App)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. SSL证书配置

```bash
# 使用Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 3. 防火墙配置

```bash
# 只开放必要端口
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # 阻止直接访问
sudo ufw deny 3002/tcp  # 阻止直接访问
sudo ufw enable
```

## 📈 性能优化

### 1. 启用集群模式 (Backend)

修改 `ecosystem.config.js`:
```javascript
{
  name: 'coloring-book-backend',
  instances: 'max',  // 使用所有CPU核心
  exec_mode: 'cluster'
}
```

### 2. 静态文件优化 (Frontend)

```bash
# 安装更高性能的静态服务器
npm install -g serve

# 或使用nginx直接提供静态文件
```

### 3. 日志轮转

```bash
# 安装日志轮转插件
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🔧 开发环境

### 本地开发

```bash
# 启动开发环境 (热重载)
npm run dev

# 单独启动
npm run dev:backend   # 后端开发服务器
npm run dev:frontend  # 前端开发服务器
```

### 测试生产环境

```bash
# 本地测试生产环境
npm run build
npm run pm2:start:prod

# 访问测试
open http://localhost:3000
open http://localhost:3002/api/health
```

这样您就可以在Linux服务器上同时管理前后端服务了！🎉 