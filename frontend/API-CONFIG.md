# Frontend API 配置指南

## 概述

Frontend已经配置为支持连接远程后端服务。通过环境变量可以灵活配置API地址，支持开发和生产环境的不同需求。

## 环境变量配置

在`frontend/`目录下创建`.env`文件，配置以下变量：

```env
# API配置
VITE_API_BASE_URL=your_backend_url_here
```

## 配置选项

### 1. 开发环境（推荐）

使用Vite代理，无需配置环境变量：

```env
# .env 文件可以留空或不创建
```

Vite会自动将`/api/*`请求代理到`http://localhost:3002`

### 2. 开发环境（直连后端）

直接连接本地后端服务：

```env
VITE_API_BASE_URL=http://localhost:3002
```

### 3. 生产环境（远程后端）

连接远程后端服务器：

```env
# 使用域名
VITE_API_BASE_URL=https://your-backend-domain.com

# 或使用IP地址
VITE_API_BASE_URL=http://your-server-ip:3002
```

## 技术实现

### API配置文件

位置：`src/config/api.js`

```javascript
// 自动根据环境选择API地址
const API_BASE_URL = import.meta.env.MODE === 'development' 
  ? import.meta.env.VITE_API_BASE_URL || '' 
  : import.meta.env.VITE_API_BASE_URL || '';

// 构建完整API URL
export const buildApiUrl = (path) => {
  // 处理相对路径和绝对路径
  // 自动添加base URL
}

// 封装fetch函数
export const apiFetch = async (path, options = {}) => {
  // 自动处理URL构建
  // 自动添加Content-Type headers
}
```

### Vite代理配置

位置：`vite.config.js`

```javascript
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_BASE_URL || 'http://localhost:3002',
      changeOrigin: true,
    }
  }
}
```

## 使用方式

所有API调用已经自动更新为使用新的配置：

```javascript
// 旧方式
fetch('/api/images')

// 新方式（自动应用）
apiFetch('/api/images')
```

## 部署说明

### 开发环境

1. 启动后端服务（端口3002）
2. 启动前端开发服务器：`npm run dev`
3. 前端会自动代理API请求到后端

### 生产环境

1. 配置`.env`文件设置`VITE_API_BASE_URL`
2. 构建前端：`npm run build`
3. 部署`dist`目录到静态文件服务器
4. 确保后端服务可访问

## 故障排除

### 1. API请求失败

- 检查`.env`文件中的`VITE_API_BASE_URL`配置
- 确认后端服务正在运行
- 检查网络连接和防火墙设置

### 2. 开发环境代理问题

- 确认`vite.config.js`中的代理配置正确
- 重启开发服务器
- 检查后端服务端口是否为3002

### 3. 生产环境CORS问题

- 确认后端服务器配置了正确的CORS设置
- 检查`Access-Control-Allow-Origin`头部设置

## 测试连接

可以在浏览器开发者工具中检查网络请求，确认API调用是否使用了正确的URL。 