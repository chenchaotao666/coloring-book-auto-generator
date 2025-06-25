# 前端图片保存功能 API 文档

## 概述

本文档描述了如何将前端生成的图片数据保存到数据库中的API接口。支持单张图片保存和批量保存功能。

## API 端点

### 1. 获取保存选项

**端点**: `GET /api/db-images/save-options`

**描述**: 获取保存图片时可用的分类和标签选项，用于前端选择界面。

**响应**:
```json
{
  "success": true,
  "message": "获取保存选项成功",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": {"zh": "动物", "en": "Animals"},
        "description": {"zh": "各种动物主题的涂色页", "en": "Animal-themed coloring pages"},
        "thumbnailUrl": null
      }
    ],
    "tags": [
      {
        "id": 1,
        "name": {"zh": "简单", "en": "Easy"},
        "description": {"zh": "适合初学者", "en": "Suitable for beginners"}
      }
    ]
  }
}
```

### 2. 保存单张选中图片

**端点**: `POST /api/db-images/save-selected`

**描述**: 从前端生成的内容中选择性保存单张图片到数据库。

**请求体**:
```json
{
  "title": "选中的图片标题",
  "description": "图片描述（可选）",
  "imagePath": "./images/generated_image.png",
  "prompt": "生成图片的提示词（可选）",
  "ratio": "1:1",
  "type": "selected",
  "isPublic": true,
  "userId": "user_123",
  "categoryId": 1,
  "tagIds": [1, 2],
  "additionalInfo": {
    "custom_field": "自定义数据"
  }
}
```

**字段说明**:
- `title` (必填): 图片标题
- `description` (可选): 图片描述
- `imagePath` 或 `defaultUrl` (可选): 图片文件路径
- `prompt` (可选): 生成图片的提示词
- `ratio` (可选): 图片比例，默认"1:1"
- `type` (可选): 图片类型，默认"selected"
- `isPublic` (可选): 是否公开，默认true
- `userId` (可选): 用户ID，默认"frontend_user"
- `categoryId` (可选): 分类ID
- `tagIds` (可选): 标签ID数组
- `additionalInfo` (可选): 额外信息对象

**响应**:
```json
{
  "success": true,
  "message": "图片保存成功",
  "data": {
    "id": "uuid-string",
    "title": {"zh": "选中的图片标题", "en": "选中的图片标题"},
    "defaultUrl": "./images/generated_image.png",
    "type": "selected",
    "ratio": "1:1",
    "isPublic": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 批量保存生成的图片

**端点**: `POST /api/db-images/save-generated`

**描述**: 批量保存前端生成的多张图片到数据库。

**请求体**:
```json
{
  "images": [
    {
      "title": "图片1",
      "description": "第一张图片",
      "imagePath": "./images/generated_1.png",
      "prompt": "提示词1",
      "ratio": "1:1",
      "categoryId": 1,
      "tagIds": [1, 2]
    },
    {
      "title": "图片2",
      "description": "第二张图片",
      "imagePath": "./images/generated_2.png",
      "prompt": "提示词2",
      "ratio": "4:3",
      "categoryId": 2,
      "tagIds": [2, 3]
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "message": "成功保存 2/2 张图片",
  "data": {
    "savedImages": [
      {
        "id": "uuid-1",
        "title": {"zh": "图片1", "en": "图片1"},
        "defaultUrl": "./images/generated_1.png"
      },
      {
        "id": "uuid-2", 
        "title": {"zh": "图片2", "en": "图片2"},
        "defaultUrl": "./images/generated_2.png"
      }
    ],
    "totalRequested": 2,
    "totalSaved": 2,
    "totalFailed": 0
  }
}
```

如果部分保存失败，响应会包含错误信息：
```json
{
  "success": true,
  "message": "成功保存 1/2 张图片，1 张失败",
  "data": {
    "savedImages": [...],
    "totalRequested": 2,
    "totalSaved": 1,
    "totalFailed": 1
  },
  "errors": [
    {
      "index": 1,
      "imageData": "图片2",
      "error": "外键约束失败"
    }
  ]
}
```

## 前端使用示例

### JavaScript/React 示例

```javascript
// 1. 获取保存选项
async function getSaveOptions() {
  try {
    const response = await fetch('/api/db-images/save-options')
    const data = await response.json()
    
    if (data.success) {
      const { categories, tags } = data.data
      console.log('可用分类:', categories)
      console.log('可用标签:', tags)
      return { categories, tags }
    }
  } catch (error) {
    console.error('获取保存选项失败:', error)
  }
}

// 2. 保存单张选中图片
async function saveSelectedImage(imageData) {
  try {
    const response = await fetch('/api/db-images/save-selected', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: imageData.title,
        description: imageData.description,
        imagePath: imageData.imagePath,
        prompt: imageData.prompt,
        ratio: imageData.ratio || '1:1',
        categoryId: imageData.selectedCategoryId,
        tagIds: imageData.selectedTagIds,
        userId: 'current_user_id'
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('图片保存成功:', result.data.id)
      return result.data
    } else {
      console.error('保存失败:', result.message)
    }
  } catch (error) {
    console.error('保存图片时出错:', error)
  }
}

// 3. 批量保存图片
async function saveBatchImages(images) {
  try {
    const response = await fetch('/api/db-images/save-generated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ images })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log(`批量保存完成: ${result.data.totalSaved}/${result.data.totalRequested}`)
      
      if (result.errors && result.errors.length > 0) {
        console.warn('部分图片保存失败:', result.errors)
      }
      
      return result.data
    } else {
      console.error('批量保存失败:', result.message)
    }
  } catch (error) {
    console.error('批量保存时出错:', error)
  }
}

// 使用示例
async function handleImageSave() {
  // 先获取保存选项
  const options = await getSaveOptions()
  
  // 用户选择分类和标签后，保存图片
  const imageData = {
    title: '我选中的图片',
    description: '这是一张精美的涂色页',
    imagePath: './images/my_selected_image.png',
    prompt: '蝴蝶在花园中飞舞',
    ratio: '1:1',
    selectedCategoryId: 1, // 用户选择的分类
    selectedTagIds: [1, 2] // 用户选择的标签
  }
  
  await saveSelectedImage(imageData)
}
```

### React 组件示例

```jsx
import React, { useState, useEffect } from 'react'

function ImageSaveDialog({ imageData, onSave, onCancel }) {
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSaveOptions()
  }, [])

  const loadSaveOptions = async () => {
    try {
      const response = await fetch('/api/db-images/save-options')
      const data = await response.json()
      
      if (data.success) {
        setCategories(data.data.categories)
        setTags(data.data.tags)
      }
    } catch (error) {
      console.error('加载保存选项失败:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const response = await fetch('/api/db-images/save-selected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...imageData,
          categoryId: parseInt(selectedCategory) || null,
          tagIds: selectedTags.map(id => parseInt(id))
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        onSave(result.data)
      } else {
        alert('保存失败: ' + result.message)
      }
    } catch (error) {
      alert('保存时出错: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="save-dialog">
      <h3>保存图片到数据库</h3>
      
      <div className="form-group">
        <label>分类:</label>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">请选择分类</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name.zh || cat.name.en}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>标签:</label>
        <div className="tags-container">
          {tags.map(tag => (
            <label key={tag.id} className="tag-checkbox">
              <input
                type="checkbox"
                checked={selectedTags.includes(tag.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTags([...selectedTags, tag.id])
                  } else {
                    setSelectedTags(selectedTags.filter(id => id !== tag.id))
                  }
                }}
              />
              {tag.name.zh || tag.name.en}
            </label>
          ))}
        </div>
      </div>

      <div className="actions">
        <button onClick={onCancel} disabled={saving}>
          取消
        </button>
        <button onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存到数据库'}
        </button>
      </div>
    </div>
  )
}
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

### 常见错误场景

1. **外键约束失败**: 选择的分类ID或标签ID不存在
2. **必填字段缺失**: 没有提供图片标题
3. **数据库连接失败**: 数据库服务不可用

### 错误处理示例

```javascript
async function saveImageWithErrorHandling(imageData) {
  try {
    const response = await fetch('/api/db-images/save-selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageData)
    })
    
    const result = await response.json()
    
    if (!result.success) {
      switch (response.status) {
        case 400:
          alert('请检查输入的数据格式')
          break
        case 404:
          alert('选择的分类或标签不存在')
          break
        case 500:
          alert('服务器错误，请稍后重试')
          break
        default:
          alert('保存失败: ' + result.message)
      }
      return null
    }
    
    return result.data
  } catch (error) {
    alert('网络错误，请检查连接')
    return null
  }
}
```

## 注意事项

1. **图片路径**: 确保图片文件路径正确且可访问
2. **外键关系**: 分类ID和标签ID必须存在于数据库中
3. **数据格式**: 多语言字段会自动转换为JSON格式存储
4. **权限控制**: 根据业务需要实现用户权限验证
5. **文件管理**: 考虑图片文件的实际存储和访问策略 