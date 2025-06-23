# 涂色书内容自动生成器

一个基于React + Express的全栈应用，用于自动生成涂色书的内容和图片。

## 功能特性

- ✨ 智能内容生成：基于关键词和描述自动生成涂色书内容
- 🤖 多模型支持：集成DeepSeek、GPT、Claude等主流大模型
- 🎨 图片生成：根据Prompt自动生成涂色页图片
- 📝 内容编辑：支持在线编辑生成的内容
- 📊 数据导出：支持导出为Excel文档
- 🔄 流式显示：实时显示生成进度
- 💾 本地存储：支持本地文件存储，无需数据库

## 技术栈

### 前端
- React 18
- Vite
- Radix UI
- Tailwind CSS
- Lucide React

### 后端
- Node.js
- Express
- fs-extra
- axios

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install:all
```

### 2. 启动开发服务器

```bash
# 同时启动前端和后端
npm run dev
```

或者分别启动：

```bash
# 启动后端 (端口5000)
npm run dev:backend

# 启动前端 (端口3000)
npm run dev:frontend
```

### 3. 访问应用

- 前端应用：http://localhost:3000
- 后端API：http://localhost:5000

## 配置大模型API（可选）

如果要使用真实的大模型API，请在 `backend` 目录下创建 `.env` 文件：

```env
PORT=5000
OPENAI_API_KEY=your_openai_api_key_here
CLAUDE_API_KEY=your_claude_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

如果未配置API密钥，系统将使用模拟数据进行演示。

## 项目结构

```
coloring-book-auto-generator/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/ui/   # UI组件库
│   │   ├── lib/            # 工具函数
│   │   ├── App.jsx         # 主应用组件
│   │   └── main.jsx        # 入口文件
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Express后端服务
│   ├── server.js           # 服务器主文件
│   └── package.json
├── storage/                # 本地数据存储目录
├── images/                 # 生成的图片存储目录
├── docs/                   # 文档目录
└── README.md
```

## API接口

### 生成内容
- **POST** `/api/generate-content`
- 流式响应，实时返回生成的内容

### 生成图片
- **POST** `/api/generate-images`
- 流式响应，实时返回图片生成结果

### 导出Excel
- **POST** `/api/export-excel`
- 导出生成的内容为Excel文档

### 健康检查
- **GET** `/api/health`
- 检查服务状态

## 使用说明

1. **输入内容**：在表单中输入关键词、描述、生成数量等信息
2. **选择模板**：可以使用默认模板或自定义文案模板
3. **生成内容**：点击"生成内容"按钮，系统会流式显示生成的内容
4. **编辑内容**：点击编辑按钮可以修改生成的任何字段
5. **生成图片**：点击"生成图片"按钮为每个内容生成对应的图片
6. **导出数据**：点击"导出Excel"按钮下载包含所有内容的表格文件

## 开发说明

### 支持的大模型

- **OpenAI GPT系列**：GPT-3.5 Turbo、GPT-4
- **Claude系列**：Claude-3 Haiku
- **DeepSeek系列**：DeepSeek Chat、DeepSeek Coder

### 获取DeepSeek API密钥

1. 访问 [DeepSeek官网](https://platform.deepseek.com/)
2. 注册账号并获取API密钥
3. 在 `backend/.env` 文件中添加：`DEEPSEEK_API_KEY=your_key_here`

### 添加新的大模型支持

1. 在 `backend/server.js` 中添加对应的API调用函数
2. 在前端的模型选择器中添加新选项
3. 更新环境变量配置

### 添加新的图片生成服务

1. 在 `generateSingleImage` 函数中添加API调用逻辑
2. 配置相应的API密钥
3. 处理不同服务的响应格式

## 注意事项

- 首次运行会自动创建 `storage` 和 `images` 目录
- 生成的内容会保存在本地文件中
- 如未配置真实API，系统使用模拟数据演示功能
- 建议在生产环境中配置真实的大模型API密钥

## 许可证

MIT License 