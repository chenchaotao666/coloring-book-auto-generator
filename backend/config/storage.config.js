// 存储配置文件 - 统一管理所有存储相关的配置
const path = require('path');

// MinIO 对象存储配置
const MINIO_CONFIG = {
  // 服务端点配置
  ENDPOINT: process.env.MINIO_ENDPOINT || 'http://117.72.222.222:9100',

  // 认证配置
  ACCESS_KEY_ID: process.env.MINIO_ACCESS_KEY_ID || 'root',
  SECRET_ACCESS_KEY: process.env.MINIO_SECRET_ACCESS_KEY || 'Hongyu_1022',

  // 存储桶配置
  BUCKET_NAME: process.env.MINIO_BUCKET_NAME || 'chenchaotao',

  // 图片分类存储路径
  STORAGE_PATHS: {
    TEXT_TO_IMAGE: 'sketch',    // 文生图（涂色底图）
    IMAGE_COLORING: 'coloring', // 图片上色
    IMAGE_TO_IMAGE: 'color'     // 图生图
  },

  // 连接配置
  USE_SSL: process.env.MINIO_USE_SSL === 'true' || false,

  // 端口自动检测和切换配置
  AUTO_PORT_SWITCH: {
    ENABLED: true,
    MAIN_PORT: 9000,
    ALTERNATIVE_PORT: 9001,
    TEST_TIMEOUT: 2000
  },

  // 上传配置
  UPLOAD: {
    TIMEOUT: 15000, // 上传超时时间（毫秒）
    RETRY_ATTEMPTS: 2, // 重试次数
    RETRY_DELAY: 1000, // 重试延迟（毫秒）
    DIRECT_UPLOAD: true, // 直接上传到公网，不保存本地
    LOCAL_BACKUP: false // 是否保留本地备份
  },

  // MIME类型映射
  MIME_TYPES: {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.tiff': 'image/tiff',
    '.ico': 'image/x-icon'
  },

  // 默认MIME类型
  DEFAULT_MIME_TYPE: 'application/octet-stream'
};

// 本地存储配置
const LOCAL_STORAGE_CONFIG = {
  // 本地图片存储目录
  IMAGES_DIR: path.join(process.cwd(), 'images'),
  STORAGE_DIR: path.join(process.cwd(), 'storage'),

  // 文件命名配置
  FILENAME_PATTERN: {
    PREFIX_SEPARATOR: '_',
    TIMESTAMP_FORMAT: 'timestamp', // 或 'date'
    UUID_LENGTH: 8, // UUID截取长度
    DEFAULT_EXTENSION: '.png'
  },

  // 目录权限
  DIR_PERMISSIONS: { recursive: true }
};

// 文件上传规则配置
const UPLOAD_RULES = {
  // 支持的图片格式
  ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'],

  // 文件大小限制（字节）
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB

  // 图片尺寸限制
  MAX_DIMENSIONS: {
    WIDTH: 4096,
    HEIGHT: 4096
  },

  // 文件命名规则
  NAMING: {
    SANITIZE_FILENAME: true,
    MAX_FILENAME_LENGTH: 255,
    REPLACE_SPACES: '_',
    LOWERCASE: false
  }
};

// API配置
const API_CONFIG = {
  // 网络请求配置
  REQUEST: {
    TIMEOUT: 30000, // 30秒
    MAX_RETRIES: 2,
    RETRY_DELAY: 1000,
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },

  // 下载配置
  DOWNLOAD: {
    CHUNK_SIZE: 1024 * 1024, // 1MB chunks
    CONCURRENT_DOWNLOADS: 3,
    TIMEOUT: 60000 // 60秒下载超时
  }
};

// 环境特定配置
const ENV_CONFIG = {
  // 开发环境
  development: {
    DEBUG_UPLOADS: true,
    VERBOSE_LOGGING: true,
    SKIP_URL_VALIDATION: false
  },

  // 生产环境
  production: {
    DEBUG_UPLOADS: false,
    VERBOSE_LOGGING: false,
    SKIP_URL_VALIDATION: false
  },

  // 测试环境
  test: {
    DEBUG_UPLOADS: false,
    VERBOSE_LOGGING: false,
    SKIP_URL_VALIDATION: true
  }
};

// 获取当前环境配置
const getCurrentEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env] || ENV_CONFIG.development;
};

// 生成完整的MinIO URL
const generateMinioUrl = (endpoint, bucketName, objectPath) => {
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  const cleanPath = objectPath.startsWith('/') ? objectPath.slice(1) : objectPath;
  return `${cleanEndpoint}/${bucketName}/${cleanPath}`;
};

// 从文件扩展名获取MIME类型
const getMimeTypeFromExtension = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return MINIO_CONFIG.MIME_TYPES[ext] || MINIO_CONFIG.DEFAULT_MIME_TYPE;
};

// 验证文件是否为支持的图片格式
const isValidImageType = (filename) => {
  const ext = path.extname(filename).toLowerCase().slice(1); // 移除点号
  return UPLOAD_RULES.ALLOWED_IMAGE_TYPES.includes(ext);
};

// 生成唯一文件名
const generateUniqueFilename = (originalName, prefix = '') => {
  const { v4: uuidv4 } = require('uuid');
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const shortUuid = uuidv4().split('-')[0];

  const parts = [prefix, timestamp, shortUuid].filter(Boolean);
  return parts.join(LOCAL_STORAGE_CONFIG.FILENAME_PATTERN.PREFIX_SEPARATOR) + ext;
};

// 根据图片类型生成存储路径
const generateStoragePath = (imageType, filename) => {
  const basePath = MINIO_CONFIG.STORAGE_PATHS[imageType];
  if (!basePath) {
    throw new Error(`未知的图片类型: ${imageType}`);
  }
  return `${basePath}/${filename}`;
};

// 根据图片类型生成完整的公网URL
const generatePublicImageUrl = (imageType, filename) => {
  const storagePath = generateStoragePath(imageType, filename);
  return generateMinioUrl(MINIO_CONFIG.ENDPOINT, MINIO_CONFIG.BUCKET_NAME, storagePath);
};

module.exports = {
  // 主要配置对象
  MINIO_CONFIG,
  LOCAL_STORAGE_CONFIG,
  UPLOAD_RULES,
  API_CONFIG,
  ENV_CONFIG,

  // 工具函数
  getCurrentEnvConfig,
  generateMinioUrl,
  getMimeTypeFromExtension,
  isValidImageType,
  generateUniqueFilename,
  generateStoragePath,
  generatePublicImageUrl,

  // 向后兼容的导出（保持原有的环境变量名）
  MINIO_ENDPOINT: MINIO_CONFIG.ENDPOINT,
  MINIO_ACCESS_KEY_ID: MINIO_CONFIG.ACCESS_KEY_ID,
  MINIO_SECRET_ACCESS_KEY: MINIO_CONFIG.SECRET_ACCESS_KEY,
  MINIO_BUCKET_NAME: MINIO_CONFIG.BUCKET_NAME
}; 