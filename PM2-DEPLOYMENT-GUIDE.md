# PM2 Linux部署指南

## 🚀 快速开始

### 1. 安装PM2

```bash
# 全局安装PM2
npm install -g pm2

# 或者使用yarn
yarn global add pm2
```

### 2. 项目部署

```bash
# 克隆项目
git clone https://github.com/your-username/coloring-book-auto-generator.git
cd coloring-book-auto-generator

# 安装依赖
cd backend && npm install
cd ../frontend && npm install && npm run build

# 配置环境变量
cd ../backend
cp .env.example .env
# 编辑.env文件，配置数据库和API密钥

# 创建日志目录
mkdir -p logs

# 启动服务
npm run pm2:start:prod
```

## 📋 PM2 命令详解

### 基本命令

```bash
# 启动服务 (开发环境)
npm run pm2:start

# 启动服务 (生产环境)
npm run pm2:start:prod

# 重启服务
npm run pm2:restart

# 停止服务
npm run pm2:stop

# 删除服务
npm run pm2:delete

# 查看日志
npm run pm2:logs

# 监控服务
npm run pm2:monit
```

### 直接使用PM2命令

```bash
# 启动
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看详细信息
pm2 show coloring-book-backend

# 重启
pm2 restart coloring-book-backend

# 重载 (零停机重启)
pm2 reload coloring-book-backend

# 停止
pm2 stop coloring-book-backend

# 删除
pm2 delete coloring-book-backend

# 查看日志
pm2 logs coloring-book-backend

# 实时日志
pm2 logs coloring-book-backend --lines 100

# 监控面板
pm2 monit

# 保存当前进程列表
pm2 save

# 开机自启动
pm2 startup
```

## 🔧 配置说明

### ecosystem.config.js 配置项说明

- `name`: 应用名称
- `script`: 启动脚本
- `cwd`: 工作目录
- `instances`: 实例数量 (1=单实例, 'max'=CPU核心数)
- `autorestart`: 自动重启
- `watch`: 文件监控 (生产环境建议关闭)
- `max_memory_restart`: 内存限制重启
- `env`: 环境变量
- `error_file`: 错误日志文件
- `out_file`: 输出日志文件
- `log_file`: 合并日志文件

### 集群模式 (可选)

如果需要启用集群模式，修改 `ecosystem.config.js`:

```javascript
{
  instances: 'max',  // 使用所有CPU核心
  exec_mode: 'cluster'
}
```

## 🔍 监控和管理

### 1. 查看服务状态

```bash
pm2 status
```

输出示例：
```
┌─────┬─────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name                    │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼─────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ coloring-book-backend   │ default     │ 1.0.0   │ fork    │ 12345    │ 2h     │ 0    │ online    │ 0%       │ 45.2mb   │ ubuntu   │ disabled │
└─────┴─────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### 2. 实时监控

```bash
pm2 monit
```

### 3. 日志管理

```bash
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs coloring-book-backend

# 清空日志
pm2 flush

# 日志轮转 (需要安装pm2-logrotate)
pm2 install pm2-logrotate
```

## 🔄 部署流程

### 手动部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
cd backend && npm install

# 3. 构建项目
npm run build

# 4. 重启服务
npm run pm2:restart
```

### 自动化部署

```bash
# 使用PM2部署功能
pm2 deploy production setup    # 首次部署
pm2 deploy production          # 后续部署
```

## 🛠️ 故障排除

### 常见问题

1. **服务启动失败**
```bash
# 查看错误日志
pm2 logs coloring-book-backend --err

# 检查配置文件
pm2 show coloring-book-backend
```

2. **内存泄漏**
```bash
# 设置内存限制自动重启
# 在ecosystem.config.js中配置 max_memory_restart: '1G'
```

3. **端口冲突**
```bash
# 检查端口占用
netstat -tlnp | grep :3002

# 杀死占用端口的进程
sudo kill -9 <pid>
```

### 日志位置

- 错误日志: `./logs/err.log`
- 输出日志: `./logs/out.log`
- 合并日志: `./logs/combined.log`

## 🔐 安全建议

1. **使用非root用户运行**
```bash
# 创建专用用户
sudo adduser --system --group --home /var/www/coloring-book coloring-app

# 设置目录权限
sudo chown -R coloring-app:coloring-app /var/www/coloring-book
```

2. **配置防火墙**
```bash
# 只开放必要端口
sudo ufw allow 3002/tcp
sudo ufw enable
```

3. **定期备份**
```bash
# 备份数据库
mysqldump -u root -p image_processing_db > backup.sql

# 备份项目文件
tar -czf coloring-book-backup.tar.gz /var/www/coloring-book
```

## 📈 性能优化

1. **启用集群模式**
2. **配置Nginx反向代理**
3. **使用缓存策略**
4. **监控资源使用**

```bash
# 安装性能监控
pm2 install pm2-server-monit
```

## 🔗 相关链接

- [PM2官方文档](https://pm2.keymetrics.io/)
- [PM2生态系统配置](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2部署指南](https://pm2.keymetrics.io/docs/usage/deployment/) 