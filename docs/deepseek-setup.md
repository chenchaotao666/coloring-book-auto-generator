# DeepSeek 大模型配置指南

## 简介

DeepSeek是一家专注于AI大模型研发的公司，提供高质量的语言模型服务。本应用已集成DeepSeek API，支持以下模型：

- **deepseek-chat**: 通用对话模型，适合创意内容生成
- **deepseek-coder**: 代码优化模型，适合技术类内容

## 配置步骤

### 1. 注册DeepSeek账号

1. 访问 [DeepSeek平台](https://platform.deepseek.com/)
2. 点击"注册"按钮
3. 使用邮箱或手机号完成注册
4. 验证账号并登录

### 2. 获取API密钥

1. 登录后，进入控制台
2. 在左侧菜单找到"API Keys"
3. 点击"创建新密钥"
4. 输入密钥名称（如：coloring-book-generator）
5. 复制生成的API密钥

### 3. 配置环境变量

在项目的 `backend` 目录下创建或编辑 `.env` 文件：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 其他配置
PORT=5000
```

### 4. 验证配置

启动应用后：

1. 前端选择 "DeepSeek Chat" 或 "DeepSeek Coder"
2. 输入测试关键词（如：机器人）
3. 点击"生成内容"
4. 查看是否成功调用API生成内容

## 模型特点

### DeepSeek Chat
- **适用场景**: 创意内容、故事创作、文案生成
- **特点**: 创意性强，语言表达丰富
- **推荐用途**: 涂色书内容文案、描述性文字

### DeepSeek Coder  
- **适用场景**: 技术文档、代码相关内容
- **特点**: 逻辑性强，结构化程度高
- **推荐用途**: 技术类涂色书、编程主题内容

## 费用说明

DeepSeek采用按使用量计费的模式：

- 新用户通常有免费额度
- 具体定价请查看官网最新价格
- 建议先用免费额度测试功能

## 常见问题

### Q: API调用失败怎么办？
A: 检查以下几点：
1. API密钥是否正确
2. 账号余额是否充足
3. 网络连接是否正常
4. 查看后端日志的错误信息

### Q: 生成的内容格式不正确？
A: DeepSeek有时返回的不是标准JSON格式，应用已做容错处理，会自动提取JSON部分。

### Q: 如何切换模型？
A: 在前端界面的模型选择器中选择不同的DeepSeek模型即可。

## 技术支持

如有问题，请：
1. 查看后端控制台的错误日志
2. 检查DeepSeek官方文档
3. 在项目Issues中反馈问题

## 更新日志

- **v1.0**: 初次集成DeepSeek Chat和Coder模型
- **v1.1**: 优化JSON解析，提高兼容性 