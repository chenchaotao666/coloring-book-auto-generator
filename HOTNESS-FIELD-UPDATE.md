# 热度字段功能更新说明

## 更新概述

为 `images` 和 `categories` 表新增了 `hotness` 热度字段，用于表示图片和分类的热门程度。已完成后端模型、前端界面的全面更新。

## 数据库变更

### 新增字段

**categories 表:**
- `hotness INT DEFAULT 0` - 分类热度值，范围 0-1000

**images 表:**
- `hotness INT DEFAULT 0` - 图片热度值，范围 0-1000

### 新增索引
- `CREATE INDEX idx_images_hotness ON images(hotness)`
- `CREATE INDEX idx_categories_hotness ON categories(hotness)`

## 后端更新

### 1. CategoryModel.js
- ✅ 添加 `hotness` 字段到所有查询语句
- ✅ 更新 `create` 方法支持热度值
- ✅ 更新 `update` 方法支持热度值
- ✅ 默认值设为 0

### 2. ImageModel.js
- ✅ 添加 `hotness` 字段到所有查询语句
- ✅ 更新 `create` 方法支持热度值
- ✅ 更新 `update` 方法支持热度值
- ✅ 默认值设为 0

### 3. 路由更新
- ✅ `categories.js` - 支持创建和更新时的热度值
- ✅ `images.js` - 通过表单自动支持热度值

## 前端更新

### 1. 分类管理 (CategoriesManager.jsx)
- ✅ 表单新增热度输入框 (0-1000)
- ✅ 表格新增热度列，显示数值和进度条
- ✅ 编辑时自动加载现有热度值
- ✅ 热度进度条可视化显示

### 2. 图片管理 (ImagesManager.jsx)
- ✅ 图片列表显示热度信息
- ✅ 热度值和小型进度条展示
- ✅ 编辑时支持热度值修改

### 3. 图片表单 (ImageForm.jsx)
- ✅ 基础信息区域新增热度输入框
- ✅ 数值输入限制 (0-1000)
- ✅ 输入提示和说明文字

## 功能特性

### 1. 热度值范围
- **范围**: 0-1000
- **默认值**: 0
- **用途**: 表示内容的热门程度，数值越高越热门

### 2. 可视化展示
- **进度条**: 渐变色彩 (蓝色到红色/橙色)
- **进度计算**: `width = min(100, hotness / 10)%`
- **数值显示**: 直接显示热度数值

### 3. 表单验证
- **类型**: 数字输入
- **最小值**: 0
- **最大值**: 1000
- **自动转换**: 空值自动转为 0

## 界面展示

### 分类管理界面
- 表格新增"热度"列
- 显示热度数值 + 16px宽度进度条
- 表单中添加热度输入框，带说明文字

### 图片管理界面
- 图片列表中显示热度信息
- 小型进度条 (8px宽度) 展示热度
- 表单中可编辑热度值

## 使用说明

### 1. 设置热度值
- 在创建/编辑分类或图片时，可设置热度值
- 推荐热度值：
  - 0-200: 普通内容
  - 200-500: 较受欢迎
  - 500-800: 热门内容
  - 800-1000: 超级热门

### 2. 热度应用场景
- 内容推荐排序
- 热门内容筛选
- 数据分析统计
- 用户界面优先级展示

## 兼容性说明

- ✅ **向后兼容**: 现有数据自动设置热度为 0
- ✅ **API兼容**: 所有现有API接口保持兼容
- ✅ **数据完整性**: 外键约束和索引优化
- ✅ **前端兼容**: 现有功能不受影响

## 技术细节

### 1. 数据库层面
```sql
-- 热度字段定义
hotness INT DEFAULT 0 COMMENT '热度值，范围 0-1000'

-- 索引优化
CREATE INDEX idx_images_hotness ON images(hotness);
CREATE INDEX idx_categories_hotness ON categories(hotness);
```

### 2. 前端样式
```css
/* 热度进度条样式 */
.hotness-bar {
  background: linear-gradient(to right, #60a5fa, #f97316);
  border-radius: 9999px;
}
```

### 3. 数据处理
```javascript
// 热度值处理
const hotness = parseInt(value) || 0;
const progressWidth = Math.min(100, hotness / 10);
```

## 后续优化建议

1. **热度算法**: 可基于访问量、点赞数等自动计算热度
2. **热度排序**: 添加按热度排序的功能
3. **热度统计**: 提供热度分布统计图表
4. **热度标签**: 根据热度值自动显示"热门"、"推荐"等标签
5. **热度历史**: 记录热度值变化历史

## 版本信息

- **更新日期**: 2024年
- **影响范围**: 分类管理、图片管理
- **数据库版本**: v1.0+
- **前端组件**: CategoriesManager, ImagesManager, ImageForm 