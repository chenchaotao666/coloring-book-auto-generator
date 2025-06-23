# VS Code 调试指南

## 🚀 快速开始

已为您配置好完整的VS Code调试环境，包含以下调试配置：

### 调试配置选项

1. **🐛 调试后端服务器** - 主要的调试配置
2. **🚀 启动服务器 (生产模式)** - 生产环境模式
3. **🧪 调试API测试** - 调试测试脚本
4. **🔗 附加到运行中的进程** - 附加调试

## 📋 使用步骤

### 1. 启动调试

在VS Code中：
1. 按 `F5` 或 `Ctrl+F5`
2. 选择 "🐛 调试后端服务器"
3. 服务器将在调试模式下启动

### 2. 设置断点

- 在代码行号左侧点击设置断点 🔴
- 推荐在以下位置设置断点：
  ```javascript
  // API入口点
  app.post('/api/generate-content', async (req, res) => {
    const { keyword, description, count, template, model } = req.body // 断点1
    
  // DeepSeek API调用
  async function callDeepSeekAPI(keyword, description, template, model) {
    const prompt = `基于以下信息生成涂色书内容：` // 断点2
    
  // 错误处理
  } catch (error) {
    console.error('DeepSeek API调用失败:', error) // 断点3
  ```

### 3. 调试功能

**变量查看**：
- 鼠标悬停查看变量值
- 侧边栏"变量"面板查看所有变量
- 调试控制台输入表达式查看值

**调用堆栈**：
- 查看函数调用链
- 点击堆栈项跳转到对应代码

**监视表达式**：
- 添加需要持续监视的表达式
- 实时查看值的变化

## 🔧 调试技巧

### 1. 条件断点
右键断点设置条件，例如：
```javascript
keyword === '蝴蝶'
index === 3
error.response.status === 400
```

### 2. 日志断点
不暂停执行，只输出日志：
```javascript
console.log('API调用参数:', keyword, description)
```

### 3. 调试控制台命令
在调试暂停时，可以在控制台执行：
```javascript
// 查看变量
req.body
response.data

// 修改变量
keyword = '新关键词'

// 调用函数
JSON.stringify(mockContent, null, 2)
```

## 🐛 常见调试场景

### 1. DeepSeek API调用失败
**断点位置**：
```javascript
// backend/server.js 第289行附近
async function callDeepSeekAPI(keyword, description, template, model) {
  // 在这里设置断点
```

**检查项目**：
- `process.env.DEEPSEEK_API_KEY` 是否存在
- `requestData` 的内容是否正确
- `response.data` 的结构

### 2. 内容生成异常
**断点位置**：
```javascript
// 第164行附近
async function generateSingleContent(keyword, description, template, model, index) {
  // 检查参数是否正确
```

### 3. 流式响应问题
**断点位置**：
```javascript
// 第41行附近
for (let i = 0; i < count; i++) {
  const content = await generateSingleContent(...) // 断点
  res.write(`data: ${JSON.stringify({...})}`) // 断点
}
```

## 📊 环境变量调试

调试时会自动设置：
```
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

可以在 `.vscode/launch.json` 中修改这些设置。

## 🔍 性能调试

### 1. 查看API响应时间
在调试控制台查看：
```javascript
console.time('API调用')
// API调用代码
console.timeEnd('API调用')
```

### 2. 内存使用情况
```javascript
console.log('内存使用:', process.memoryUsage())
```

## 🛠️ 调试配置说明

### launch.json 配置详解

```json
{
  "name": "🐛 调试后端服务器",
  "type": "node",                    // Node.js调试器
  "request": "launch",               // 启动新进程
  "program": "backend/server.js",    // 入口文件
  "cwd": "backend",                  // 工作目录
  "env": {                          // 环境变量
    "DEBUG": "true",
    "LOG_LEVEL": "debug"
  },
  "envFile": "backend/.env",         // 环境变量文件
  "console": "integratedTerminal",   // 使用集成终端
  "restart": true,                   // 自动重启
  "skipFiles": ["<node_internals>/**"] // 跳过Node.js内部文件
}
```

## ⚡ 快捷键

- `F5` - 开始调试
- `Ctrl+F5` - 开始执行(不调试)
- `F9` - 切换断点
- `F10` - 单步跳过
- `F11` - 单步进入
- `Shift+F11` - 单步跳出
- `Shift+F5` - 停止调试
- `Ctrl+Shift+F5` - 重新启动调试

## 🔗 相关文件

- `.vscode/launch.json` - 调试配置
- `.vscode/tasks.json` - 任务配置  
- `.vscode/settings.json` - 工作区设置
- `backend/.env` - 环境变量

## 📞 故障排除

### 1. 调试器无法启动
- 检查Node.js版本 (`node --version`)
- 确保在正确的工作目录
- 检查 `backend/server.js` 文件是否存在

### 2. 断点不生效
- 确保文件已保存
- 检查是否在正确的文件设置断点
- 重新启动调试会话

### 3. 环境变量未加载
- 检查 `backend/.env` 文件是否存在
- 确保文件格式正确（无BOM）
- 重新启动VS Code

---

💡 **提示**: 第一次调试时，建议在 `app.post('/api/generate-content')` 的第一行设置断点，这样可以确保调试器正常工作。 