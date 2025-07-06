const Minio = require('minio');
const fetch = require('node-fetch');
const axios = require('axios');
const https = require('https');
const http = require('http');
const dns = require('dns');

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
async function uploadStreamAndGetUrl(source, uploadPath, retryCount = 2) {
  const envConfig = getCurrentEnvConfig();

  // 针对慢速服务器也只重试2次
  if (typeof source === 'string' && source.includes('tempfile.aiquickdraw.com')) {
    retryCount = Math.max(retryCount, 2); // 慢速服务器最多2次重试
    console.log(`🐌 检测到慢速服务器，重试次数设为 ${retryCount} 次`);
  }

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

        // 针对慢速服务器的特殊处理
        const isSlowServer = source.includes('tempfile.aiquickdraw.com') ||
          source.includes('slow-api') ||
          source.includes('temp');

        const timeoutDuration = isSlowServer ? 180000 : 90000; // 慢速服务器3分钟，其他90秒

        console.log(`📡 开始下载图片 (${isSlowServer ? '慢速服务器' : '普通服务器'}): ${source}`);
        console.log(`⏱️  超时设置: ${timeoutDuration / 1000}秒`);

        // DNS预检查
        try {
          const url = new URL(source);
          console.log(`🔍 DNS预检查: ${url.hostname}`);

          // 设置DNS优先使用IPv4
          dns.setDefaultResultOrder('ipv4first');

          const addresses = await new Promise((resolve, reject) => {
            dns.resolve4(url.hostname, (err, addresses) => {
              if (err) {
                console.log(`⚠️  IPv4 DNS解析失败: ${err.message}`);
                // 尝试IPv6
                dns.resolve6(url.hostname, (err6, addresses6) => {
                  if (err6) {
                    console.log(`⚠️  IPv6 DNS解析也失败: ${err6.message}`);
                    reject(new Error(`DNS解析失败: ${err.message}`));
                  } else {
                    console.log(`✅ IPv6 DNS解析成功: ${addresses6.slice(0, 2).join(', ')}`);
                    resolve(addresses6);
                  }
                });
              } else {
                console.log(`✅ IPv4 DNS解析成功: ${addresses.slice(0, 2).join(', ')}`);
                resolve(addresses);
              }
            });
          });
        } catch (dnsError) {
          console.log(`⚠️  DNS预检查失败，继续尝试下载: ${dnsError.message}`);
        }

        // 快速连接测试（针对问题服务器）
        if (isSlowServer) {
          console.log(`🔍 执行快速连接测试...`);
          try {
            const url = new URL(source);
            const quickTestResult = await new Promise((resolve) => {
              const startTime = Date.now();
              const req = https.request({
                hostname: url.hostname,
                port: 443,
                method: 'HEAD',
                timeout: 10000,
                agent: new https.Agent({
                  family: 4,
                  timeout: 10000,
                  rejectUnauthorized: false
                })
              }, (res) => {
                const duration = Date.now() - startTime;
                console.log(`✅ 快速连接测试成功 - ${duration}ms`);
                req.destroy();
                resolve(true);
              });

              req.on('error', (error) => {
                const duration = Date.now() - startTime;
                console.log(`❌ 快速连接测试失败 - ${duration}ms - ${error.code}`);
                resolve(false);
              });

              req.on('timeout', () => {
                const duration = Date.now() - startTime;
                console.log(`⏰ 快速连接测试超时 - ${duration}ms`);
                req.destroy();
                resolve(false);
              });

              req.end();
            });

            if (!quickTestResult) {
              console.log(`⚠️  快速连接测试失败，服务器可能不可达，保持重试次数为2次`);
              retryCount = Math.min(retryCount, 2); // 减少重试次数
            }
          } catch (testError) {
            console.log(`⚠️  快速连接测试异常: ${testError.message}`);
          }
        }

        // 尝试多种网络配置策略
        let response;
        let lastError;

        // 策略1: 标准配置
        try {
          console.log(`🔗 尝试策略1: 标准HTTPS配置`);
          response = await axios({
            method: 'get',
            url: source,
            responseType: 'stream',
            timeout: timeoutDuration,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            },
            maxRedirects: 10,
            validateStatus: function (status) {
              return status >= 200 && status < 300;
            },
            httpsAgent: new https.Agent({
              rejectUnauthorized: false,
              keepAlive: true,
              timeout: isSlowServer ? 120000 : 60000,
              maxSockets: 1,
              scheduling: 'fifo',
              family: 4  // 强制使用IPv4
            }),
            httpAgent: new http.Agent({
              keepAlive: true,
              timeout: isSlowServer ? 120000 : 60000,
              maxSockets: 1,
              scheduling: 'fifo',
              family: 4  // 强制使用IPv4
            })
          });
          console.log(`✅ 策略1成功`);
        } catch (error1) {
          console.log(`❌ 策略1失败: ${error1.code || error1.message}`);
          lastError = error1;

          // 策略2: 简化配置 + 更短超时
          try {
            console.log(`🔗 尝试策略2: 简化配置`);
            response = await axios({
              method: 'get',
              url: source,
              responseType: 'stream',
              timeout: Math.min(timeoutDuration / 2, 60000), // 使用更短的超时
              headers: {
                'User-Agent': 'curl/7.68.0',  // 使用更简单的User-Agent
                'Accept': '*/*'
              },
              maxRedirects: 5,
              httpsAgent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: false,  // 不使用keep-alive
                timeout: 30000,
                family: 4  // 强制IPv4
              }),
              httpAgent: new http.Agent({
                keepAlive: false,
                timeout: 30000,
                family: 4
              })
            });
            console.log(`✅ 策略2成功`);
          } catch (error2) {
            console.log(`❌ 策略2失败: ${error2.code || error2.message}`);
            lastError = error2;

            // 策略3: 使用node-fetch作为备用
            try {
              console.log(`🔗 尝试策略3: 使用node-fetch`);
              const fetchResponse = await fetch(source, {
                timeout: Math.min(timeoutDuration / 3, 45000),
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; Node.js)',
                  'Accept': 'image/*'
                },
                agent: function (_parsedURL) {
                  if (_parsedURL.protocol == 'http:') {
                    return new http.Agent({
                      keepAlive: false,
                      timeout: 30000,
                      family: 4
                    });
                  } else {
                    return new https.Agent({
                      rejectUnauthorized: false,
                      keepAlive: false,
                      timeout: 30000,
                      family: 4
                    });
                  }
                }
              });

              if (!fetchResponse.ok) {
                throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
              }

              // 将fetch响应转换为axios兼容格式
              response = {
                data: fetchResponse.body,
                headers: Object.fromEntries(fetchResponse.headers.entries())
              };
              console.log(`✅ 策略3成功`);
            } catch (error3) {
              console.log(`❌ 策略3失败: ${error3.code || error3.message}`);
              lastError = error3;
              throw lastError; // 所有策略都失败，抛出最后一个错误
            }
          }
        }
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
        error.code === 'ECONNABORTED' ||
        error.code === 'ENETUNREACH' ||
        error.code === 'EHOSTUNREACH' ||
        error.code === 'EPIPE' ||
        error.message.includes('timeout') ||
        error.message.includes('aborted') ||
        error.message.includes('socket hang up') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('network') ||
        error.message.includes('AggregateError') ||
        (error.response && error.response.status >= 500);

      // 如果是最后一次尝试或者不是网络错误，直接抛出异常
      if (attempt === retryCount || !isNetworkError) {
        if (isNetworkError) {
          // 针对不同类型的网络错误提供更详细的说明
          let errorMessage = `网络连接不稳定，图片下载失败。`;

          if (isTimeoutError) {
            errorMessage += `\n📡 超时错误: 图片服务器响应过慢，已尝试 ${retryCount} 次重试。`;
            if (isSlowServer) {
              errorMessage += `\n🐌 检测到慢速服务器 (${new URL(source).hostname})，已使用最大超时时间 ${timeoutDuration / 1000} 秒。`;
              errorMessage += `\n💡 建议: 这可能是临时文件服务器的问题，请稍后重试或联系图片提供方。`;
            }

            // 检查是否是AggregateError（多IP连接失败）
            if (error.message.includes('AggregateError') || (error.errors && error.errors.length > 0)) {
              errorMessage += `\n🌐 网络诊断: 检测到多IP连接失败，可能的原因：`;
              errorMessage += `\n   • IPv6连接问题（已强制使用IPv4重试）`;
              errorMessage += `\n   • DNS解析返回多个IP但都无法连接`;
              errorMessage += `\n   • 网络防火墙阻止访问该域名`;
              errorMessage += `\n   • 目标服务器暂时不可用`;

              if (error.errors) {
                const uniqueAddresses = [...new Set(error.errors.map(e => e.address).filter(Boolean))];
                if (uniqueAddresses.length > 0) {
                  errorMessage += `\n   • 尝试的IP地址: ${uniqueAddresses.slice(0, 4).join(', ')}${uniqueAddresses.length > 4 ? '...' : ''}`;
                }
              }
            }
          } else {
            errorMessage += `\n🔗 连接错误: ${error.code || error.message}`;
          }

          errorMessage += `\n🔄 已重试 ${retryCount} 次，仍然失败。`;
          throw new Error(errorMessage);
        } else {
          throw new Error(`文件流上传失败: ${error.message}`);
        }
      }

      // 网络错误且还有重试机会，等待后重试
      // 针对慢速服务器和超时错误使用更长的重试间隔
      const isTimeoutError = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isSlowServer = source.includes('tempfile.aiquickdraw.com');

      let retryDelay;
      if (isSlowServer || isTimeoutError) {
        retryDelay = Math.min(attempt * 8000, 30000); // 慢速服务器：8秒, 16秒, 24秒, 最多30秒
      } else {
        retryDelay = Math.min(attempt * 3000, 10000); // 普通错误：3秒, 6秒, 9秒, 最多10秒
      }

      console.log(`网络错误，${retryDelay / 1000}秒后进行第 ${attempt + 1} 次重试...`);
      console.log(`错误详情: ${error.code || 'UNKNOWN'} - ${error.message}`);
      console.log(`错误类型: ${isTimeoutError ? '超时错误' : '网络错误'}, 服务器类型: ${isSlowServer ? '慢速' : '普通'}`);
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
async function downloadAndUploadToCategory(imageUrl, imageType, filename = null, retryCount = 2) {
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

/**
 * 测试图片下载功能
 * @param {string} imageUrl - 图片URL
 * @returns {Promise<Object>} 测试结果
 */
async function testImageDownload(imageUrl) {
  console.log(`🔍 测试图片下载: ${imageUrl}`);

  const testResults = {
    url: imageUrl,
    tests: []
  };

  // 测试1: 基本的HEAD请求
  try {
    const isSlowServer = imageUrl.includes('tempfile.aiquickdraw.com');
    const timeoutDuration = isSlowServer ? 180000 : 30000;

    console.log(`🔍 HEAD请求测试 (${isSlowServer ? '慢速服务器' : '普通服务器'}，超时: ${timeoutDuration / 1000}秒)`);

    const headResponse = await axios.head(imageUrl, {
      timeout: timeoutDuration,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        timeout: isSlowServer ? 120000 : 30000,
        maxSockets: 1
      })
    });
    testResults.tests.push({
      name: 'HEAD请求',
      success: true,
      status: headResponse.status,
      contentType: headResponse.headers['content-type'],
      contentLength: headResponse.headers['content-length']
    });
  } catch (error) {
    testResults.tests.push({
      name: 'HEAD请求',
      success: false,
      error: error.message,
      code: error.code
    });
  }

  // 测试2: 流式下载（前1KB）
  try {
    const isSlowServer = imageUrl.includes('tempfile.aiquickdraw.com');
    const timeoutDuration = isSlowServer ? 180000 : 30000;

    console.log(`🔍 流式下载测试 (${isSlowServer ? '慢速服务器' : '普通服务器'}，超时: ${timeoutDuration / 1000}秒)`);

    const streamResponse = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream',
      timeout: timeoutDuration,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'Range': 'bytes=0-1023' // 只下载前1KB
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
        timeout: isSlowServer ? 120000 : 30000,
        maxSockets: 1
      }),
      httpAgent: new http.Agent({
        keepAlive: true,
        timeout: isSlowServer ? 120000 : 30000,
        maxSockets: 1
      })
    });

    let downloadedBytes = 0;
    streamResponse.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
    });

    await new Promise((resolve, reject) => {
      streamResponse.data.on('end', resolve);
      streamResponse.data.on('error', reject);
      setTimeout(() => reject(new Error('测试超时')), 10000);
    });

    testResults.tests.push({
      name: '流式下载测试',
      success: true,
      status: streamResponse.status,
      downloadedBytes: downloadedBytes,
      contentType: streamResponse.headers['content-type']
    });
  } catch (error) {
    testResults.tests.push({
      name: '流式下载测试',
      success: false,
      error: error.message,
      code: error.code
    });
  }

  return testResults;
}

module.exports = {
  minioClient,
  uploadFileAndGetUrl,
  uploadStreamAndGetUrl,
  uploadImageToCategory,
  downloadAndUploadToCategory,
  testImageDownload
}; 