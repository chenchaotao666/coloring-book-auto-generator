const Minio = require('minio');
const fetch = require('node-fetch');
const axios = require('axios');

// 引入统一配置
const {
  MINIO_CONFIG,
  API_CONFIG,
  generateMinioUrl,
  getMimeTypeFromExtension,
  getCurrentEnvConfig,
  generateStoragePath,
  generatePublicImageUrl
} = require('../config/storage.config');

// 从配置中获取 MinIO 配置
const {
  ENDPOINT: MINIO_ENDPOINT,
  ACCESS_KEY_ID: MINIO_ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: MINIO_SECRET_ACCESS_KEY,
  BUCKET_NAME: MINIO_BUCKET_NAME,
  USE_SSL,
  UPLOAD
} = MINIO_CONFIG;

// 创建MinIO客户端
const minioClient = new Minio.Client({
  endPoint: new URL(MINIO_ENDPOINT).hostname,
  port: parseInt(new URL(MINIO_ENDPOINT).port),
  useSSL: USE_SSL,
  accessKey: MINIO_ACCESS_KEY_ID,
  secretKey: MINIO_SECRET_ACCESS_KEY
});

/**
 * 流式上传文件到MinIO（支持URL和流对象两种输入）
 * @param {string|ReadStream} source - 源文件URL或文件流对象
 * @param {string} uploadPath - 文件在MinIO中的存储路径
 * @param {number} retryCount - 重试次数（默认为3）
 * @returns {Promise<string>} 可访问的文件URL
 */
async function uploadStreamAndGetUrl(source, uploadPath, retryCount = 3) {
  const envConfig = getCurrentEnvConfig();

  if (envConfig.VERBOSE_LOGGING) {
    console.log(`Streaming upload from ${typeof source === 'string' ? source : '[File Stream]'} to MinIO...`);
  }

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      let streamData;
      let mimeType = MINIO_CONFIG.DEFAULT_MIME_TYPE;

      if (typeof source === 'string') {
        // 如果输入是URL字符串，从URL获取文件流
        if (envConfig.VERBOSE_LOGGING) {
          console.log(`尝试第 ${attempt} 次下载: ${source}`);
        }

        const response = await axios({
          method: 'get',
          url: source,
          responseType: 'stream',
          timeout: 60000,  // 60秒超时
          headers: {
            'User-Agent': API_CONFIG.REQUEST.USER_AGENT
          },
          // 添加重试相关配置
          maxRedirects: 5
        });
        streamData = response.data;
        mimeType = response.headers['content-type'] || MINIO_CONFIG.DEFAULT_MIME_TYPE;
      } else {
        // 如果输入是流对象，直接使用
        streamData = source;
        // 使用配置文件中的MIME类型映射
        mimeType = getMimeTypeFromExtension(uploadPath);
      }

      // 设置元数据 (移除x-amz-acl，因为MinIO可能不支持)
      const metaData = {
        'Content-Type': mimeType
      };

      if (envConfig.VERBOSE_LOGGING) {
        console.log(`尝试第 ${attempt} 次上传到 MinIO: ${uploadPath}`);
      }

      // 直接流式上传到MinIO
      await minioClient.putObject(
        MINIO_BUCKET_NAME,
        uploadPath,
        streamData,
        metaData
      );

      if (envConfig.VERBOSE_LOGGING) {
        console.log('文件流上传到 MinIO 成功');
      }

      // 使用配置文件生成初始URL
      let fileUrl = generateMinioUrl(MINIO_ENDPOINT, MINIO_BUCKET_NAME, uploadPath);

      if (envConfig.VERBOSE_LOGGING) {
        console.log('Initial file URL:', fileUrl);
      }

      // URL修正逻辑（处理端口自动切换）
      if (MINIO_CONFIG.AUTO_PORT_SWITCH.ENABLED && fileUrl.includes(`:${MINIO_CONFIG.AUTO_PORT_SWITCH.MAIN_PORT}/`)) {
        if (envConfig.VERBOSE_LOGGING) {
          console.log(`Testing alternative port ${MINIO_CONFIG.AUTO_PORT_SWITCH.ALTERNATIVE_PORT}`);
        }

        const altUrl = fileUrl.replace(
          `:${MINIO_CONFIG.AUTO_PORT_SWITCH.MAIN_PORT}/`,
          `:${MINIO_CONFIG.AUTO_PORT_SWITCH.ALTERNATIVE_PORT}/`
        );

        try {
          // 测试两个URL的可访问性
          const [mainStatus, altStatus] = await Promise.allSettled([
            testUrlAccess(fileUrl),
            testUrlAccess(altUrl)
          ]);

          const mainAccessible = mainStatus.value === 200;
          const altAccessible = altStatus.value === 200;

          if (envConfig.VERBOSE_LOGGING) {
            console.log(`URL access test results:`);
            console.log(`- Main URL: ${mainAccessible ? 'Accessible' : 'Not accessible'}`);
            console.log(`- Alt URL: ${altAccessible ? 'Accessible' : 'Not accessible'}`);
          }

          // 如果主URL不可访问但替代URL可访问，则切换到替代URL
          if (!mainAccessible && altAccessible) {
            if (envConfig.VERBOSE_LOGGING) {
              console.warn(`Using alternative URL`);
            }
            fileUrl = altUrl;
          } else if (mainAccessible && envConfig.VERBOSE_LOGGING) {
            console.log('Using main URL');
          }
        } catch (testError) {
          if (envConfig.VERBOSE_LOGGING) {
            console.error('URL test failed, using main URL:', testError);
          }
        }
      }

      // 成功，返回URL
      return fileUrl;

    } catch (error) {
      console.error(`!!!!!!!! Stream Upload Error (尝试 ${attempt}/${retryCount}) !!!!!!!!`);
      console.error('Error details:', error);

      // 检查是否是网络相关错误
      const isNetworkError = error.code === 'ECONNRESET' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.message.includes('timeout') ||
        error.message.includes('aborted') ||
        error.message.includes('socket hang up');

      // 如果是最后一次尝试或者不是网络错误，直接抛出异常
      if (attempt === retryCount || !isNetworkError) {
        if (isNetworkError) {
          throw new Error(`网络连接不稳定，上传失败。请检查网络连接后重试。(错误: ${error.code || error.message})`);
        } else {
          throw new Error(`文件流上传失败: ${error.message}`);
        }
      }

      // 网络错误且还有重试机会，等待后重试
      const retryDelay = attempt * 2000; // 递增等待时间：2秒, 4秒, 6秒...
      console.log(`网络错误，${retryDelay / 1000}秒后进行第 ${attempt + 1} 次重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // 这里理论上不会到达，但为了安全起见
  throw new Error('上传失败：所有重试均失败');
}

/**
 * 上传文件到 MinIO 并获取可访问的 URL
 * @param {Object} file - 文件对象 (包含 mimetype 和 buffer)
 * @param {string} uploadPath - 文件在 MinIO 中的存储路径
 * @returns {Promise<string>} 可访问的文件 URL
 */
async function uploadFileAndGetUrl(file, uploadPath) {
  console.log('Attempting to upload file to MinIO...');

  // 设置上传元数据 (移除x-amz-acl，因为MinIO可能不支持)
  const metaData = {
    'Content-Type': file.mimetype
  };

  try {
    // 执行文件上传
    await minioClient.putObject(
      MINIO_BUCKET_NAME,
      uploadPath,
      file.buffer,
      metaData
    );
    console.log('File uploaded to MinIO successfully');
  } catch (uploadError) {
    console.error('!!!!!!!! MinIO Upload Error !!!!!!!!');
    console.error('Error details:', uploadError);
    throw new Error('文件上传失败，请稍后重试');
  }

  // 构建初始文件URL
  let fileUrl = `${MINIO_ENDPOINT}/${MINIO_BUCKET_NAME}/${uploadPath}`;
  console.log('Initial file URL:', fileUrl);

  // URL修正逻辑（处理9000/9001端口问题）
  if (fileUrl.includes(':9000/')) {
    console.log('Detected port 9000 in URL, testing alternative port 9001');

    const altUrl = fileUrl.replace(':9000/', ':9001/');
    console.log('Generated alternative URL:', altUrl);

    try {
      // 测试两个URL的可访问性
      const [mainStatus, altStatus] = await Promise.allSettled([
        testUrlAccess(fileUrl),
        testUrlAccess(altUrl)
      ]);

      const mainAccessible = mainStatus.value === 200;
      const altAccessible = altStatus.value === 200;

      console.log(`URL access test results:`);
      console.log(`- Main URL (${fileUrl}): ${mainAccessible ? 'Accessible' : 'Not accessible'}`);
      console.log(`- Alt URL (${altUrl}): ${altAccessible ? 'Accessible' : 'Not accessible'}`);

      // 如果主URL不可访问但替代URL可访问，则切换到替代URL
      if (!mainAccessible && altAccessible) {
        console.warn(`Using alternative URL (${altUrl}) because main URL is not accessible`);
        fileUrl = altUrl;
      } else if (mainAccessible) {
        console.log('Using main URL as it is accessible');
      } else {
        console.warn('Both URLs are not directly accessible. Proceeding with main URL.');
      }
    } catch (testError) {
      console.error('URL access test failed, proceeding with main URL:', testError);
    }
  }

  return fileUrl;
}

/**
 * 测试URL可访问性（内部辅助函数）
 * @param {string} url - 要测试的URL
 * @returns {Promise<number>} HTTP状态码
 */
async function testUrlAccess(url) {
  const envConfig = getCurrentEnvConfig();

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: MINIO_CONFIG.AUTO_PORT_SWITCH.TEST_TIMEOUT
    });
    return response.status;
  } catch (error) {
    if (envConfig.VERBOSE_LOGGING) {
      console.log(`URL access test failed for ${url}:`, error.message);
    }
    return 500; // 表示访问失败
  }
}

/**
 * 直接上传图片到分类存储路径
 * @param {string|ReadStream} source - 源文件URL或文件流对象
 * @param {string} imageType - 图片类型 ('TEXT_TO_IMAGE', 'IMAGE_COLORING', 'IMAGE_TO_IMAGE')
 * @param {string} filename - 文件名
 * @returns {Promise<string>} 可访问的文件URL
 */
async function uploadImageToCategory(source, imageType, filename) {
  const envConfig = getCurrentEnvConfig();

  try {
    // 生成分类存储路径
    const storagePath = generateStoragePath(imageType, filename);

    if (envConfig.VERBOSE_LOGGING) {
      console.log(`📂 上传图片到分类存储: ${imageType} -> ${storagePath}`);
    }

    // 调用现有的上传函数
    return await uploadStreamAndGetUrl(source, storagePath);

  } catch (error) {
    console.error(`上传图片到分类存储失败 (${imageType}):`, error);
    throw error;
  }
}

/**
 * 直接从URL下载并上传到分类存储
 * @param {string} imageUrl - 图片URL
 * @param {string} imageType - 图片类型
 * @param {string} filename - 文件名（可选，自动生成）
 * @param {number} retryCount - 重试次数（默认为3）
 * @returns {Promise<Object>} 包含公网URL和存储信息的对象
 */
async function downloadAndUploadToCategory(imageUrl, imageType, filename = null, retryCount = 3) {
  const envConfig = getCurrentEnvConfig();

  try {
    if (envConfig.VERBOSE_LOGGING) {
      console.log(`📥 直接下载并上传到分类存储: ${imageUrl} -> ${imageType}`);
    }

    // 如果没有提供文件名，自动生成
    if (!filename) {
      const { v4: uuidv4 } = require('uuid');
      const ext = '.png'; // 默认PNG格式
      filename = `${imageType.toLowerCase()}_${Date.now()}_${uuidv4().split('-')[0]}${ext}`;
    }

    // 生成存储路径
    const storagePath = generateStoragePath(imageType, filename);

    // 直接从URL上传到MinIO（带重试）
    const publicUrl = await uploadStreamAndGetUrl(imageUrl, storagePath, retryCount);

    if (envConfig.VERBOSE_LOGGING) {
      console.log(`✅ 图片已直接上传到公网: ${publicUrl}`);
    }

    return {
      publicUrl: publicUrl,
      filename: filename,
      storagePath: storagePath,
      imageType: imageType,
      localPath: null // 没有本地存储
    };

  } catch (error) {
    console.error(`❌ 直接上传到分类存储失败:`, error);
    console.error(`   图片URL: ${imageUrl}`);
    console.error(`   目标类型: ${imageType}`);
    console.error(`   文件名: ${filename}`);
    throw error;
  }
}

module.exports = {
  minioClient,
  uploadFileAndGetUrl,
  uploadStreamAndGetUrl,
  uploadImageToCategory,
  downloadAndUploadToCategory
}; 