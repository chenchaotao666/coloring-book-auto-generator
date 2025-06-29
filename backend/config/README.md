# 存储配置说明文档

## 概述

`storage.config.js` 文件提供了涂色书项目中所有存储相关功能的统一配置管理。

## 🚀 新功能：分类存储

现在支持将不同类型的图片存储到不同的目录中：

- **文生图** (TEXT_TO_IMAGE): 存储在 `ENDPOINT/BUCKET_NAME/sketch/` 目录
- **图片上色** (IMAGE_COLORING): 存储在 `ENDPOINT/BUCKET_NAME/coloring/` 目录  
- **图生图** (IMAGE_TO_IMAGE): 存储在 `ENDPOINT/BUCKET_NAME/color/` 目录

### 直接公网存储
- 图片不再保存到本地，直接上传到公网存储
- 根据图片类型自动分类存储
- 提高存储效率和访问速度

## 主要配置模块

### 1. MinIO 对象存储配置 (MINIO_CONFIG)

```javascript
const config = require('./config/storage.config');
const { MINIO_CONFIG } = config;

// 访问配置
console.log(MINIO_CONFIG.ENDPOINT);          // MinIO服务端点
console.log(MINIO_CONFIG.BUCKET_NAME);       // 存储桶名称
console.log(MINIO_CONFIG.AUTO_PORT_SWITCH);  // 端口自动切换配置
```

### 2. 本地存储配置 (LOCAL_STORAGE_CONFIG)

```javascript
const { LOCAL_STORAGE_CONFIG } = config;

// 本地存储路径
console.log(LOCAL_STORAGE_CONFIG.IMAGES_DIR);  // 图片存储目录
console.log(LOCAL_STORAGE_CONFIG.STORAGE_DIR); // 通用存储目录
```

### 3. 上传规则配置 (UPLOAD_RULES)

```javascript
const { UPLOAD_RULES } = config;

// 文件大小和格式限制
console.log(UPLOAD_RULES.MAX_FILE_SIZE);        // 最大文件大小
console.log(UPLOAD_RULES.ALLOWED_IMAGE_TYPES);  // 支持的图片格式
```

## 工具函数

### generateUniqueFilename(originalName, prefix)
生成唯一的文件名：
```javascript
const { generateUniqueFilename } = config;
const filename = generateUniqueFilename('image.png', 'generated');
// 输出: generated_1640995200000_a1b2c3d4.png
```

### getMimeTypeFromExtension(filename)
根据文件扩展名获取MIME类型：
```javascript
const { getMimeTypeFromExtension } = config;
const mimeType = getMimeTypeFromExtension('image.png');
// 输出: image/png
```

### isValidImageType(filename)
验证文件是否为支持的图片格式：
```javascript
const { isValidImageType } = config;
const isValid = isValidImageType('photo.jpg');
// 输出: true
```

### generateStoragePath(imageType, filename)
根据图片类型生成分类存储路径：
```javascript
const { generateStoragePath } = config;
const path = generateStoragePath('TEXT_TO_IMAGE', 'image.png');
// 输出: sketch/image.png
```

### generatePublicImageUrl(imageType, filename)
生成完整的分类存储公网URL：
```javascript
const { generatePublicImageUrl } = config;
const url = generatePublicImageUrl('IMAGE_COLORING', 'colored.png');
// 输出: http://endpoint:port/bucket/coloring/colored.png
```

## 环境配置

支持不同环境的配置：

- **development**: 详细日志、调试上传
- **production**: 最小日志、优化性能
- **test**: 跳过URL验证、简化流程

```javascript
const { getCurrentEnvConfig } = config;
const envConfig = getCurrentEnvConfig();

if (envConfig.VERBOSE_LOGGING) {
  console.log('详细日志已启用');
}
```

## 环境变量支持

可以通过环境变量覆盖默认配置：

```bash
# MinIO配置
MINIO_ENDPOINT=http://your-minio-server:9000
MINIO_ACCESS_KEY_ID=your_access_key
MINIO_SECRET_ACCESS_KEY=your_secret_key
MINIO_BUCKET_NAME=your_bucket_name
MINIO_USE_SSL=false

# 环境设置
NODE_ENV=production
```

## 使用示例

### 在服务文件中使用配置

```javascript
// services/imageService.js
const {
  MINIO_CONFIG,
  LOCAL_STORAGE_CONFIG,
  generateUniqueFilename,
  getCurrentEnvConfig
} = require('../config/storage.config');

async function processImage(imageData) {
  const envConfig = getCurrentEnvConfig();
  
  // 生成唯一文件名
  const filename = generateUniqueFilename('image.png', 'processed');
  
  // 使用配置的存储路径
  const localPath = path.join(LOCAL_STORAGE_CONFIG.IMAGES_DIR, filename);
  
  if (envConfig.VERBOSE_LOGGING) {
    console.log(`Processing image: ${filename}`);
  }
  
  // ... 处理逻辑
}
```

### 在工具文件中使用配置

```javascript
// utils/storageUtil.js
const {
  MINIO_CONFIG,
  generateMinioUrl,
  getMimeTypeFromExtension
} = require('../config/storage.config');

function uploadFile(stream, filename) {
  const mimeType = getMimeTypeFromExtension(filename);
  const timeout = MINIO_CONFIG.UPLOAD.TIMEOUT;
  
  // ... 上传逻辑
}
```

### 新的分类存储使用示例

```javascript
// services/imageService.js
const { downloadAndUploadToCategory } = require('../utils/storageUtil');

// 直接上传文生图到sketch目录
async function saveTextToImage(imageUrl) {
  const result = await downloadAndUploadToCategory(
    imageUrl, 
    'TEXT_TO_IMAGE'
  );
  console.log(`文生图已保存: ${result.publicUrl}`);
  // URL示例: http://endpoint:port/bucket/sketch/filename.png
}

// 直接上传上色图片到coloring目录
async function saveColoredImage(imageUrl) {
  const result = await downloadAndUploadToCategory(
    imageUrl, 
    'IMAGE_COLORING'
  );
  console.log(`上色图已保存: ${result.publicUrl}`);
  // URL示例: http://endpoint:port/bucket/coloring/filename.png
}

// 直接上传图生图到color目录
async function saveImageToImage(imageUrl) {
  const result = await downloadAndUploadToCategory(
    imageUrl, 
    'IMAGE_TO_IMAGE'
  );
  console.log(`图生图已保存: ${result.publicUrl}`);
  // URL示例: http://endpoint:port/bucket/color/filename.png
}
```

## 配置热更新

配置文件支持运行时修改（重启服务后生效）：

1. 修改 `storage.config.js` 中的默认值
2. 或设置对应的环境变量
3. 重启服务使配置生效

## 迁移说明

### 从本地存储到分类公网存储

如果你之前使用本地存储，现在可以迁移到分类公网存储：

1. **配置更新**: 
   - `MINIO_CONFIG.UPLOAD.DIRECT_UPLOAD = true`
   - `MINIO_CONFIG.UPLOAD.LOCAL_BACKUP = false`

2. **代码更新**:
   ```javascript
   // 旧方式
   const result = await downloadAndSaveImage(imageUrl, filename);
   
   // 新方式 - 指定图片类型
   const result = await downloadAndUploadToPublic(imageUrl, 'TEXT_TO_IMAGE', filename);
   ```

3. **URL结构变化**:
   ```
   旧: http://endpoint:port/bucket/filename.png
   新: http://endpoint:port/bucket/sketch/filename.png
   ```

## 最佳实践

1. **统一配置**: 所有存储相关配置都在 `storage.config.js` 中管理
2. **分类存储**: 根据图片用途选择正确的存储类型
3. **环境变量**: 生产环境使用环境变量覆盖敏感配置
4. **类型安全**: 使用配置文件中提供的工具函数而不是硬编码
5. **日志控制**: 根据环境配置控制日志输出级别
6. **直接上传**: 使用新的直接上传功能提高效率
7. **向后兼容**: 配置文件保持对现有代码的兼容性 