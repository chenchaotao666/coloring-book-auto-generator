#!/bin/bash

echo "涂色书内容生成器启动脚本"
echo "======================="

echo "正在安装依赖..."
npm run install:all

echo ""
echo "启动服务..."
npm run dev 