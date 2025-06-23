# KIEAI图片生成功能集成指南

## 概述

已成功将KIEAI的GPT-4o图片生成API集成到 `backend/server.js` 的 `generateSingleImage` 函数中。系统支持智能降级，如果KIEAI API不可用或未配置，会自动使用占位符图片。

## 功能特性

### ✨ 核心功能
- **真实AI图片生成** - 使用KIEAI GPT-4o API生成高质量涂色页图片
- **专业prompt构建** - 基于colobook-0609/config/prp.config.js的专业涂色页规范
- **智能降级机制** - API失败时自动使用占位符，保证系统稳定性
- **异步任务处理** - 支持任务提交和状态轮询
- **自动下载存储** - 生成的图片自动下载并保存到本地
- **完善错误处理** - 详细的错误码处理和日志记录

### 🔧 技术实现
- **专业prompt构建** - 自动将简单描述转换为包含完整规范的专业prompt
- **流式传输** - 图片直接从KIEAI下载到本地，无中间缓存
- **任务轮询** - 最多等待2分钟，每5秒检查一次任务状态  
- **文件管理** - 使用UUID重命名，避免文件名冲突
- **超时控制** - 30秒下载超时，防止长时间挂起

## 配置说明

### 环境变量配置

在 `backend/.env` 文件中添加以下配置：

```env
# KIEAI图片生成API配置
KIEAI_API_URL=https://kieai.erweima.ai/api/v1
KIEAI_AUTH_TOKEN=your_real_kieai_token_here
```

### 获取KIEAI API Token

1. 访问 [KIEAI官方文档](https://docs.kie.ai/zh-CN/4o-image-api/get-4-o-image-download-url)
2. 注册账户并获取API Token
3. 将Token替换到环境变量中

## API调用流程

### 1. 图片生成请求
```javascript
// 请求示例
POST /api/generate-images
{
  "contents": [{
    "id": "content_123",
    "prompt": "一只可爱的蝴蝶在花园中飞舞，涂色页风格，黑白线条画"
  }]
}
```

### 2. 内部处理流程
```
用户请求 → generateSingleImage函数 → 检查KIEAI配置
    ↓
构建专业prompt → 调用KIEAI API → 获取taskId → 轮询任务状态
    ↓
任务完成 → 下载图片 → 保存到本地 → 返回路径
```

### 3. 响应格式
```javascript
// 流式响应
data: {"type":"image","id":"content_123","imagePath":"./images/image_content_123_1234567890.png"}
```

## 专业Prompt构建

### 🎨 涂色页规范
基于 `colobook-0609/config/prp.config.js` 的专业规范，系统会自动将简单的用户描述转换为包含完整技术规范的专业prompt。

#### 原始用户输入
```
一只美丽的蝴蝶在花园中飞舞
```

#### 自动构建的专业Prompt
```
Generate a black and white line art coloring page (8.5×8.5 inches) with the following specifications:

MAIN SUBJECT: 一只美丽的蝴蝶在花园中飞舞

ARTWORK SPECIFICATIONS:
- Pure white background – No shading, textures, or gray tones.
- Solid black lines only – All details drawn with 1mm thick uniform black lines, no gradients.
- Hand-drawn border – 1.5mm-2mm thick organic, slightly wavy border (no straight edges), placed 0.5cm inside the page edge.

ADDITIONAL REQUIREMENTS:
- Add 'printablecoloringhub.com' in simple sans-serif font, centered at the bottom of the overall 8.5×8.5 inch page.
- 100% vector-friendly, high-contrast line art suitable for printing and coloring.

STYLE GUIDELINES:
- Create a peaceful, engaging, and suitable-for-all-ages design
- Include interesting details that will be fun to color
- Ensure all elements are clearly defined with bold black outlines
- Make sure the design is not too complex for children but engaging enough for adults
- Focus on creating a therapeutic and relaxing coloring experience

TECHNICAL SPECIFICATIONS:
- Image size: 8.5×8.5 inches
- Resolution: High quality for printing
- Format: Black and white line art only
- Line weight: Consistent 1mm thick lines throughout
- No gradients, shadows, or gray tones
- Pure white background

Please generate a professional-quality coloring page that meets all these specifications.
```

#### 扩展效果
- **原始prompt**: 13字符
- **专业prompt**: ~1500字符  
- **扩展倍数**: 117x
- **包含规范**: 艺术风格、技术规格、输出要求、品牌标识等

## 代码结构

### 新增函数

#### `buildProfessionalColoringPagePrompt(userPrompt)`
- 将用户的简单描述转换为专业的涂色页生成prompt
- 包含完整的艺术规范和技术要求
- 确保生成的图片符合专业涂色书标准

#### `callKIEAIImageGeneration(prompt)`
- 调用KIEAI API生成图片
- 返回taskId
- 完整的错误码处理

#### `getKIEAITaskStatus(taskId)`
- 查询任务状态
- 支持多种状态：GENERATING, SUCCESS, FAILED等

#### `downloadAndSaveImage(imageUrl, filename)`
- 流式下载图片
- 自动保存到images目录
- 30秒超时保护

#### `generateSingleImage(prompt, id)` (修改)
- 集成KIEAI API调用
- 智能降级到占位符
- 完整的错误处理

## 状态码说明

### KIEAI API状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 401 | 未授权 - 检查Token |
| 402 | 积分不足 |
| 422 | 参数错误 |
| 429 | 请求限制 |
| 455 | 服务不可用 |
| 500 | 服务器错误 |

### 任务状态
| 状态 | 说明 |
|------|------|
| GENERATING | 生成中 |
| SUCCESS | 生成成功 |
| CREATE_TASK_FAILED | 创建任务失败 |
| GENERATE_FAILED | 生成失败 |

## 使用示例

### 基本使用
```javascript
// 在现有的图片生成流程中，无需修改前端代码
// 系统会自动判断是否使用KIEAI API

const response = await fetch('/api/generate-images', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      id: 'unique_id',
      prompt: '涂色页描述'
    }]
  })
})
```

### 监听进度
```javascript
const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6))
      if (data.type === 'image') {
        console.log('图片生成完成:', data.imagePath)
      }
    }
  }
}
```

## 注意事项

### ⚠️ 重要提醒
1. **API密钥安全** - 不要将真实的KIEAI Token提交到代码仓库
2. **积分消耗** - 每次图片生成都会消耗KIEAI账户积分
3. **生成时间** - 图片生成通常需要30秒到2分钟
4. **并发限制** - 注意KIEAI API的并发限制

### 💡 优化建议
1. **缓存机制** - 考虑对相同prompt的结果进行缓存
2. **批量处理** - 避免同时生成大量图片
3. **监控告警** - 添加积分余额监控
4. **备份方案** - 准备其他图片生成API作为备选

## 故障排除

### 常见问题

**Q: 图片生成一直返回占位符？**
A: 检查KIEAI_AUTH_TOKEN是否配置了真实Token

**Q: 提示积分不足？**
A: 登录KIEAI控制台充值账户积分

**Q: 图片生成超时？**
A: 这是正常现象，系统会自动降级使用占位符

**Q: API调用失败？**
A: 检查网络连接和KIEAI服务状态

### 日志调试

启动服务器后，观察控制台输出：
```
🎨 调用KIEAI图片生成API: [prompt内容]
📸 KIEAI API响应: [响应数据]
📋 获得任务ID: [taskId]
🔍 查询任务状态: [状态信息]
🎉 图片生成完成！
📥 开始下载图片: [图片URL]
✅ 图片下载完成: [文件名]
```

## 更新日志

### v1.1.0 (2024-06-23)
- ✅ 集成专业涂色页规范 (基于colobook-0609/config/prp.config.js)
- ✅ 添加专业prompt自动构建功能
- ✅ 实现117倍prompt扩展，包含完整技术规范
- ✅ 支持品牌标识和专业输出要求

### v1.0.0 (2024-06-23)
- ✅ 集成KIEAI GPT-4o图片生成API
- ✅ 实现智能降级机制
- ✅ 添加完整的错误处理
- ✅ 支持异步任务轮询
- ✅ 自动图片下载和存储 