# 涂色书内容生成器 - 后端API

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件（参考 `ENVIRONMENT_CONFIG.md`）：

```bash
# 复制并编辑环境变量
cp .env.example .env
```

### 3. 测试连接

```bash
# 测试数据库连接
npm run test:db

# 测试MinIO连接
npm run test:minio
```

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 配置说明

### MinIO 对象存储配置

项目使用MinIO作为对象存储服务，用于存储生成的图片。

#### 必需的环境变量：

```env
MINIO_ENDPOINT=http://117.72.222.222:9100
MINIO_ACCESS_KEY_ID=root
MINIO_SECRET_ACCESS_KEY=Hongyu_1022
MINIO_BUCKET_NAME=chenchaotao
MINIO_USE_SSL=false
```

#### 存储结构：

```
chenchaotao/
├── sketch/          # 文生图（涂色底图）
├── coloring/        # 图片上色结果
└── color/           # 图生图结果
```

### 数据库配置

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=coloring_book
```

### AI API配置

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
OPENAI_API_KEY=your_openai_api_key
GPT4O_API_KEY=your_gpt4o_api_key
FLUX_KONTEXT_API_KEY=your_flux_kontext_api_key
```

## API 端点

### 图片生成
- `POST /api/images/text-to-image` - 文生图
- `POST /api/images/image-to-image` - 图生图
- `POST /api/images/color-generate` - 图片上色

### 内容管理
- `GET /api/images` - 获取图片列表
- `POST /api/images/save-generated` - 保存生成的图片
- `GET /api/images/save-options` - 获取保存选项

### 任务状态
- `GET /api/images/task-status/:taskId` - 查询任务状态

## 开发工具

### 可用的npm脚本

```bash
npm run dev          # 开发模式启动
npm start            # 生产模式启动
npm run test:db      # 测试数据库连接
npm run test:minio   # 测试MinIO连接
npm run build        # 构建项目
npm run pm2:start    # PM2启动
npm run pm2:restart  # PM2重启
npm run pm2:logs     # 查看PM2日志
```

## 故障排除

### 常见问题

1. **MinIO连接失败**
   ```bash
   npm run test:minio
   ```
   检查端点地址、访问密钥和网络连接。

2. **数据库连接失败**
   ```bash
   npm run test:db
   ```
   检查数据库配置和服务状态。

3. **图片上传失败**
   - 检查MinIO权限设置
   - 确认存储桶存在
   - 查看服务器日志

### 调试模式

启用详细日志：

```env
DEBUG_MODE=true
VERBOSE_LOGGING=true
LOG_LEVEL=debug
```

## 部署

### 使用PM2部署

```bash
# 启动
npm run pm2:start

# 重启
npm run pm2:restart

# 查看日志
npm run pm2:logs

# 监控
npm run pm2:monit
```

### 环境变量检查

部署前确保所有必需的环境变量都已正确配置：

```bash
# 检查配置
node -e "require('dotenv').config(); console.log('MinIO端点:', process.env.MINIO_ENDPOINT); console.log('数据库主机:', process.env.DB_HOST);"
```

## 安全注意事项

1. 不要将 `.env` 文件提交到版本控制
2. 定期更换API密钥和访问凭证
3. 在生产环境中使用HTTPS
4. 限制MinIO访问权限
5. 定期备份数据库

## 技术栈

- **框架**: Express.js
- **数据库**: MySQL
- **对象存储**: MinIO
- **文件上传**: Multer
- **AI服务**: DeepSeek, OpenAI, GPT-4O, Flux Kontext
- **进程管理**: PM2

## 许可证

MIT License 