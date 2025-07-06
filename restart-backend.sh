#!/bin/bash

echo "正在重启后端服务..."

# 停止现有的backend进程
pm2 stop coloring-book-backend 2>/dev/null || echo "backend服务未运行"

# 删除现有的backend进程
pm2 delete coloring-book-backend 2>/dev/null || echo "backend进程不存在"

# 启动backend服务
cd backend
pm2 start ecosystem.config.js

# 显示状态
pm2 list

echo "后端服务重启完成！"
echo "可以使用以下命令查看日志："
echo "pm2 logs coloring-book-backend --lines 50" 