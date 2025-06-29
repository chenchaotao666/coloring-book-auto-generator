# AI图像生成功能整合指南

## 概述

本项目已将所有图像生成功能集中整合到 `backend/services/imageColoringService.js` 中，支持**文生图**、**图生图**和**图片上色**三个核心功能。用户可以在前端界面中选择使用不同的API进行生成。

## 功能架构

### 🔧 服务整合
所有图片生成相关功能现已集中在统一的服务文件中：
- **核心服务**: `backend/services/imageColoringService.js`
- **路由接口**: `backend/routes/images.js`
- **前端调用**: 通过统一的API接口调用

### 📋 支持的功能

#### 1. 文生图 (Text-to-Image)
根据文本描述生成涂色页图片
- **API端点**: `POST /api/images/text-to-image`
- **参数**: `prompt`, `apiType`, `model`, `imageRatio`

#### 2. 图生图 (Image-to-Image) 
基于输入图片生成新的涂色页图片
- **API端点**: `POST /api/images/image-to-image`
- **参数**: `imageUrl`, `prompt`, `apiType`, `model`, `imageRatio`

#### 3. 图片上色 (Image Coloring)
为黑白涂色页图片生成彩色版本
- **API端点**: `POST /api/images/color-generate`
- **参数**: `imageUrl`, `prompt`, `apiType`, `model`

## 支持的API

### 1. GPT-4O API（默认）
- **优势**: 成熟稳定，支持复杂的涂色页生成
- **速度**: 较慢（约30-60秒）
- **特点**: 高质量的线条画生成

### 2. Flux Kontext API
- **优势**: 速度快，12B参数模型
- **速度**: 快速（6-10秒）
- **特点**: 98.5%角色一致性保持率，精确的上下文编辑
- **模型**: 支持 `flux-kontext-pro` 和 `flux-kontext-max`

## API接口详情

### 基础生成接口

```javascript
// 文生图
POST /api/images/text-to-image
{
  "prompt": "一只可爱的蝴蝶",
  "apiType": "gpt4o|flux-kontext",
  "model": "flux-kontext-pro|flux-kontext-max", // 仅Flux时需要
  "imageRatio": "1:1|3:2|2:3|4:3|3:4|16:9"
}

// 图生图
POST /api/images/image-to-image
{
  "imageUrl": "https://example.com/image.jpg",
  "prompt": "转换为涂色页风格",
  "apiType": "gpt4o|flux-kontext",
  "model": "flux-kontext-pro|flux-kontext-max",
  "imageRatio": "1:1"
}

// 图片上色
POST /api/images/color-generate
{
  "imageUrl": "https://example.com/sketch.jpg",
  "prompt": "用马克笔上色，色彩鲜艳",
  "apiType": "gpt4o|flux-kontext",
  "model": "flux-kontext-pro|flux-kontext-max"
}
```

### 任务状态查询

```javascript
// 查询任务状态
GET /api/images/task-status/:taskId?apiType=gpt4o
```

### 完整生成流程

```javascript
// 一次性完成生成（包含轮询和下载）
POST /api/images/complete-generation
{
  "type": "text-to-image|image-to-image|image-coloring",
  "prompt": "生成内容",
  "apiType": "gpt4o|flux-kontext",
  "model": "flux-kontext-pro",
  "imageRatio": "1:1"
}
```

## 服务功能说明

### 🔧 核心API调用函数
- `callFluxKontextAPI()` - 统一的Flux Kontext API调用
- `callGPT4OAPI()` - 统一的GPT-4O API调用

### 🖼️ 图片处理工具
- `processImageUrl()` - 处理图片URL，确保公开访问
- `downloadAndSaveImage()` - 下载并保存图片到本地
- `buildProfessionalColoringPagePrompt()` - 构建专业涂色页prompt

### 📊 任务状态管理
- `checkTaskStatus()` - 统一的任务状态查询
- `processTaskStatus()` - 标准化任务状态响应

### 🔄 完整流程处理
- `completeImageGeneration()` - 完整的生成流程（创建任务→轮询状态→下载图片）

## 技术特性

### ✨ 功能整合
- **去重复代码**: 合并了所有重复的API调用逻辑
- **统一接口**: 提供统一的调用方式和错误处理
- **代码复用**: 最大化复用图片处理和状态管理逻辑

### 🔄 自动化流程
- **智能轮询**: 根据API类型自动调整轮询策略
- **自动下载**: 生成完成后自动下载到本地存储
- **状态标准化**: 不同API的状态统一标准化处理

### 🛡️ 错误处理
- **重试机制**: 网络错误时自动重试
- **超时控制**: 防止长时间挂起
- **降级处理**: API失败时的备选方案

## 配置说明

### 环境变量配置

```env
# KIEAI API配置
KIEAI_API_URL=https://kieai.erweima.ai/api/v1
KIEAI_AUTH_TOKEN=your_real_kieai_token_here

# 服务器URL（用于本地图片上传）
SERVER_URL=http://localhost:3000
```

## 使用示例

### 前端调用示例

```javascript
// 文生图
const textToImageResult = await fetch('/api/images/text-to-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: '一只可爱的小猫咪',
    apiType: 'flux-kontext',
    model: 'flux-kontext-pro',
    imageRatio: '1:1'
  })
});

// 图生图
const imageToImageResult = await fetch('/api/images/image-to-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: '/images/source.jpg',
    prompt: '转换为涂色页风格',
    apiType: 'gpt4o'
  })
});

// 完整生成流程
const completeResult = await fetch('/api/images/complete-generation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'text-to-image',
    prompt: '美丽的花朵',
    apiType: 'flux-kontext',
    model: 'flux-kontext-max'
  })
});
```

### Node.js服务端调用示例

```javascript
const imageService = require('./services/imageColoringService');

// 文生图
const textToImageTask = await imageService.generateTextToImage({
  prompt: '可爱的小动物',
  apiType: 'flux-kontext',
  model: 'flux-kontext-pro',
  imageRatio: '1:1'
});

// 完整流程
const localImagePath = await imageService.completeImageGeneration({
  type: 'image-coloring',
  imageUrl: '/images/sketch.jpg',
  prompt: '用水彩笔上色',
  apiType: 'gpt4o'
});
```

## 状态响应格式

### 任务状态响应

```javascript
{
  "status": "processing|completed|failed",
  "progress": 0.5,  // 0.0-1.0
  "message": "任务处理中...",
  "imageUrl": "https://...",  // 仅完成时返回
  "completed": true|false,
  "error": "错误信息"  // 仅失败时返回
}
```

### 创建任务响应

```javascript
{
  "success": true,
  "data": {
    "taskId": "uuid-task-id",
    "status": "processing",
    "message": "任务已创建",
    "apiType": "flux-kontext",
    "type": "text-to-image"
  }
}
```

## 性能优化

### 📈 处理优化
- **并发处理**: 支持多任务并发执行
- **智能延迟**: 根据API响应速度调整轮询间隔
- **内存管理**: 及时清理临时数据

### 🔧 配置优化
- **超时设置**: 合理的超时时间配置
- **重试策略**: 指数退避重试机制
- **批量处理**: 支持批量图片生成

## 错误处理

### 常见错误

| 错误类型 | 错误信息 | 解决方案 |
|---------|---------|---------|
| 401 | API未授权 | 检查KIEAI_AUTH_TOKEN配置 |
| 402 | 积分不足 | 充值KIEAI账户积分 |
| 422 | 参数错误 | 检查prompt和其他参数 |
| 429 | 请求限制 | 减少并发请求数量 |
| 超时 | 任务处理超时 | 检查网络连接和API服务状态 |

### 调试日志

系统提供详细的日志输出：
```
📡 调用Flux Kontext generate API (尝试 1/2)
✅ Flux Kontext任务创建成功，任务ID: uuid-12345
🔍 查询任务状态: uuid-12345 (flux-kontext)
📥 开始下载图片: https://...
✅ 图片下载完成: image_uuid.png
```

## 更新日志

### v2.0.0 (2024-12-19)
- ✅ 整合所有图片生成功能到统一服务
- ✅ 实现文生图、图生图、图片上色三大功能
- ✅ 统一API调用接口和错误处理
- ✅ 优化代码结构，去除重复代码
- ✅ 改进任务状态管理和轮询机制
- ✅ 增强图片处理和存储功能

### v1.1.0 (2024-06-23)
- ✅ 集成专业涂色页规范
- ✅ 添加Flux Kontext API支持
- ✅ 实现双API选择机制 