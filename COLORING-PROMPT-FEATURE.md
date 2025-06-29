# 上色提示词功能实现文档

## 功能概述

为涂色书自动生成器添加了自定义上色提示词功能，允许用户自定义图片上色的风格和要求，同时保持向后兼容性。

## 前端实现

### 1. 状态管理
在 `frontend/src/App.jsx` 中添加了上色提示词状态：

```javascript
// 上色提示词状态
const [coloringPrompt, setColoringPrompt] = useState('用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明')
```

### 2. UI界面
在API选择器下方添加了上色提示词输入框：

```javascript
<div className="space-y-2">
  <Label htmlFor="coloringPrompt" className="text-sm font-medium">上色提示词</Label>
  <Textarea
    id="coloringPrompt"
    placeholder="输入上色提示词，留空将使用默认提示词"
    value={coloringPrompt}
    onChange={(e) => setColoringPrompt(e.target.value)}
    rows={3}
    className="resize-none text-sm"
  />
  <p className="text-xs text-gray-500">
    用于指导AI如何为图片上色，留空时将使用默认的马克笔上色风格
  </p>
</div>
```

### 3. 参数传递
在批量上色和单个上色函数中添加了 `coloringPrompt` 参数传递：

```javascript
// 批量上色
body: JSON.stringify({
  imageId: databaseId,
  prompt: prompt,
  coloringPrompt: coloringPrompt.trim() || null, // 传递用户自定义的上色提示词
  options: { ... }
})

// 单个上色
body: JSON.stringify({
  imageId: imageId,
  prompt: prompt,
  coloringPrompt: coloringPrompt.trim() || null, // 传递用户自定义的上色提示词
  options: { ... }
})
```

## 后端实现

### 1. API接口修改
在 `backend/routes/images.js` 的上色API中添加了 `coloringPrompt` 参数：

```javascript
// 图片上色API
router.post('/color-generate', async (req, res) => {
  try {
    const { imageId, imageUrl, prompt, coloringPrompt, apiType = 'gpt4o', model, options } = req.body;
    
    // ... 其他逻辑
    
    const result = await imageService.generateColoredImage({
      imageUrl: actualImageUrl,
      prompt,
      coloringPrompt,  // 新增参数
      apiType: finalApiType,
      model: finalModel
    });
```

### 2. 服务层逻辑
在 `backend/services/imageColoringService.js` 中修改了提示词构造逻辑：

```javascript
async function generateColoredImage({ imageUrl, prompt, coloringPrompt, apiType = 'gpt4o', model }) {
  // 构造上色prompt - 优先使用用户自定义的coloringPrompt
  let colorPrompt;
  if (coloringPrompt) {
    // 如果用户提供了自定义上色提示词，直接使用
    colorPrompt = prompt ? `${prompt},${coloringPrompt}` : coloringPrompt;
  } else {
    // 如果用户没有提供，使用默认的上色提示词
    colorPrompt = prompt ?
      `${prompt},用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明` :
      '用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明';
  }
  
  console.log('🎨 最终上色prompt:', colorPrompt);
  // ... 继续处理
}
```

## 功能特性

### 1. 用户体验
- **默认值**：输入框预填默认的马克笔上色提示词
- **占位符**：清晰的提示信息指导用户使用
- **帮助文本**：说明功能作用和留空时的行为
- **灵活编辑**：用户可以完全自定义或基于默认内容修改

### 2. 逻辑处理
- **优先级**：用户自定义提示词 > 默认提示词
- **空值处理**：前端发送 `coloringPrompt.trim() || null`
- **向后兼容**：如果 `coloringPrompt` 为 `null` 或空，使用默认提示词
- **提示词组合**：如果有基础 `prompt`，会与上色提示词组合

### 3. 适用范围
- **批量上色**：支持为多张图片使用统一的自定义上色提示词
- **单个上色**：支持为单张图片使用自定义上色提示词
- **API兼容**：同时支持 GPT-4O 和 Flux Kontext 两种API

## 测试场景

### 1. 用户操作场景
1. **保持默认**：用户不修改输入框，使用默认马克笔风格
2. **自定义风格**：用户输入"使用水彩风格上色，颜色要柔和温馨"
3. **清空内容**：用户删除所有内容，系统自动使用默认提示词
4. **只输入空格**：前端 trim 处理后为空，使用默认提示词

### 2. 提示词组合测试
- `prompt: "可爱的小猫咪"` + `coloringPrompt: "使用水彩风格上色"` = `"可爱的小猫咪,使用水彩风格上色"`
- `prompt: ""` + `coloringPrompt: "使用水彩风格上色"` = `"使用水彩风格上色"`
- `prompt: "可爱的小猫咪"` + `coloringPrompt: null` = `"可爱的小猫咪,用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明"`

## 技术细节

### 1. 数据流
```
用户输入 → 前端状态 → API请求 → 后端处理 → AI调用 → 图片生成
```

### 2. 参数传递
```javascript
// 前端
coloringPrompt.trim() || null

// 后端接收
const { coloringPrompt } = req.body;

// 服务层处理
if (coloringPrompt) {
  // 使用用户自定义
} else {
  // 使用默认提示词
}
```

### 3. 向后兼容
- 现有API调用不传 `coloringPrompt` 参数时，行为不变
- 默认提示词保持与之前完全一致
- 不影响现有的批量上色和单个上色功能

## 部署说明

1. **前端**：已修改 `frontend/src/App.jsx`，需要重新构建前端应用
2. **后端**：已修改 `backend/routes/images.js` 和 `backend/services/imageColoringService.js`，需要重启后端服务
3. **数据库**：无需修改数据库结构
4. **配置**：无需修改配置文件

## 使用说明

1. 在界面上找到"上色提示词"输入框
2. 默认已填入马克笔上色风格的提示词
3. 可以修改为任何想要的上色风格，如：
   - "使用水彩风格上色，颜色要柔和温馨"
   - "用彩铅上色，色彩要自然真实"
   - "使用油画风格，色彩浓郁厚重"
4. 如果清空输入框，系统会自动使用默认的马克笔风格
5. 设置好后，执行批量上色或单个上色即可

## 优势

1. **灵活性**：用户可以完全控制上色风格
2. **易用性**：提供合理的默认值，降低使用门槛
3. **兼容性**：完全向后兼容，不影响现有功能
4. **一致性**：批量和单个上色都支持自定义提示词
5. **智能处理**：自动处理空值和空格，避免用户误操作 