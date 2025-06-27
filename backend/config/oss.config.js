const Minio = require('minio');
const fetch = require('node-fetch');
const axios = require('axios');

// MinIO 配置 - 从环境变量获取
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'http://117.72.222.222:9000';
const MINIO_ACCESS_KEY_ID = process.env.MINIO_ACCESS_KEY_ID || 'root';
const MINIO_SECRET_ACCESS_KEY = process.env.MINIO_SECRET_ACCESS_KEY || 'Hongyu_1022';
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'chenchaotao';

const minioClient = new Minio.Client({
  endPoint: new URL(MINIO_ENDPOINT).hostname,
  port: parseInt(new URL(MINIO_ENDPOINT).port),
  useSSL: false,
  accessKey: MINIO_ACCESS_KEY_ID,
  secretKey: MINIO_SECRET_ACCESS_KEY
});

/**
 * 从URL流式上传文件到MinIO
 * @param {string} sourceUrl - 源文件URL
 * @param {string} uploadPath - 文件在MinIO中的存储路径
 * @returns {Promise<string>} 可访问的文件URL
 */
async function uploadStreamAndGetUrl(sourceUrl, uploadPath) {
  console.log(`Streaming upload from ${sourceUrl} to MinIO...`);

  try {
    // 从源URL获取文件流
    const response = await axios({
      method: 'get',
      url: sourceUrl,
      responseType: 'stream',
      timeout: 15000
    });

    // 获取MIME类型
    const mimeType = response.headers['content-type'] || 'application/octet-stream';

    // 设置元数据
    const metaData = {
      'Content-Type': mimeType,
      'x-amz-acl': 'public-read'
    };

    // 直接流式上传到MinIO
    await minioClient.putObject(
      MINIO_BUCKET_NAME,
      uploadPath,
      response.data,
      metaData
    );

    console.log('File stream uploaded to MinIO successfully');

    // 构建初始文件URL
    let fileUrl = `${MINIO_ENDPOINT}/${MINIO_BUCKET_NAME}/${uploadPath}`;
    console.log('Initial file URL:', fileUrl);

    // URL修正逻辑（处理9000/9001端口问题）
    if (fileUrl.includes(':9000/')) {
      console.log('Testing alternative port 9001');
      const altUrl = fileUrl.replace(':9000/', ':9001/');

      try {
        // 测试两个URL的可访问性
        const [mainStatus, altStatus] = await Promise.allSettled([
          testUrlAccess(fileUrl),
          testUrlAccess(altUrl)
        ]);

        const mainAccessible = mainStatus.value === 200;
        const altAccessible = altStatus.value === 200;

        console.log(`URL access test results:`);
        console.log(`- Main URL: ${mainAccessible ? 'Accessible' : 'Not accessible'}`);
        console.log(`- Alt URL: ${altAccessible ? 'Accessible' : 'Not accessible'}`);

        // 如果主URL不可访问但替代URL可访问，则切换到替代URL
        if (!mainAccessible && altAccessible) {
          console.warn(`Using alternative URL`);
          fileUrl = altUrl;
        } else if (mainAccessible) {
          console.log('Using main URL');
        }
      } catch (testError) {
        console.error('URL test failed, using main URL:', testError);
      }
    }

    return fileUrl;

  } catch (error) {
    console.error('!!!!!!!! Stream Upload Error !!!!!!!!');
    console.error('Error details:', error);
    throw new Error('文件流上传失败');
  }
}

/**
 * 上传文件到 MinIO 并获取可访问的 URL
 * @param {Object} file - 文件对象 (包含 mimetype 和 buffer)
 * @param {string} uploadPath - 文件在 MinIO 中的存储路径
 * @returns {Promise<string>} 可访问的文件 URL
 */
async function uploadFileAndGetUrl(file, uploadPath) {
  console.log('Attempting to upload file to MinIO...');

  // 设置上传元数据
  const metaData = {
    'Content-Type': file.mimetype,
    'x-amz-acl': 'public-read'
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
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 2000
    });
    return response.status;
  } catch (error) {
    console.log(`URL access test failed for ${url}:`, error.message);
    return 500; // 表示访问失败
  }
}

module.exports = {
  minioClient,
  uploadFileAndGetUrl,
  uploadStreamAndGetUrl
}; 