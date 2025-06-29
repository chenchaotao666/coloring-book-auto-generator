# 数据库结构更新说明 v1.0

## 更新概述

数据库配置文件已从 `database_config.txt` 更新为 `database_config_v1.0.txt`，主要变化包括主键类型和外键约束的优化。

## 主要变化

### 1. 主键类型变更

**之前（自增INT）:**
- `categories.id` (INT AUTO_INCREMENT)
- `tags.id` (INT AUTO_INCREMENT)

**现在（UUID）:**
- `categories.category_id` (VARCHAR(36))
- `tags.tag_id` (VARCHAR(36))

### 2. 外键约束优化

**images 表外键:**
- `categoryId` → `categories.category_id`
- 添加了 `ON DELETE SET NULL ON UPDATE CASCADE` 约束

**image_tags 表外键:**
- `image_id` → `images.id`
- `tag_id` → `tags.tag_id`
- 添加了 `ON DELETE CASCADE ON UPDATE CASCADE` 约束

### 3. 新增字段

**images 表新增:**
- `taskId VARCHAR(255)` - 任务ID字段

## 代码更新

### 1. 模型层更新

#### CategoryModel.js
- ✅ 使用 `uuid` 生成主键
- ✅ 更新 `create` 方法使用 UUID
- ✅ 主键字段名从 `id` 改为 `category_id`

#### TagModel.js
- ✅ 使用 `uuid` 生成主键
- ✅ 更新 `create` 方法使用 UUID
- ✅ 主键字段名从 `id` 改为 `tag_id`

#### ImageModel.js
- ✅ 添加 `taskId` 字段支持
- ✅ 更新所有查询语句包含 `taskId`
- ✅ 外键关联保持兼容

### 2. 路由层
- ✅ 无需修改，路由层代码已兼容

### 3. 前端适配
- ✅ 前端代码已正确使用 `category_id` 和 `tag_id`
- ✅ 无需额外修改

## 数据迁移

### 如果您有现有数据，请按以下步骤迁移：

1. **备份现有数据**
```sql
-- 导出现有数据
mysqldump -u root -p image_processing_db > backup_before_v1.0.sql
```

2. **执行新的数据库脚本**
```bash
mysql -u root -p < database_config_v1.0.txt
```

3. **如需保留数据，请手动迁移数据结构**

### 全新部署

直接执行新的数据库脚本：
```bash
mysql -u root -p < database_config_v1.0.txt
```

## 测试验证

运行测试脚本验证更新是否成功：

```bash
cd backend
node test-database-structure.js
```

测试内容包括：
- ✅ 数据库连接测试
- ✅ UUID主键创建测试
- ✅ 外键关联测试
- ✅ 多对多关系测试
- ✅ 统计查询测试

## 优势

### 1. UUID主键优势
- 全局唯一性
- 分布式系统友好
- 安全性更高（不暴露数据量）

### 2. 外键约束优势
- 数据完整性保障
- 级联删除避免孤立数据
- 更好的数据一致性

### 3. 字段扩展
- `taskId` 支持异步任务跟踪
- 为未来功能扩展预留空间

## 注意事项

1. **性能考虑**: UUID 比 INT 占用更多存储空间，但对于中小型应用影响微乎其微
2. **索引优化**: 已为常用查询字段创建索引
3. **兼容性**: 所有现有 API 接口保持兼容
4. **依赖包**: 确保安装了 `uuid` 包（已在 package.json 中）

## 版本信息

- **数据库版本**: v1.0
- **更新日期**: 2024年
- **兼容性**: 向后兼容现有 API 