const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { uploadStreamAndGetUrl, downloadAndUploadToCategory } = require('../utils/storageUtil');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// 引入统一配置
const {
  LOCAL_STORAGE_CONFIG,
  API_CONFIG,
  generateUniqueFilename,
  getCurrentEnvConfig
} = require('../config/storage.config');

// 配置 - 你需要根据实际情况修改这些配置
const KIEAI_API_URL = process.env.KIEAI_API_URL || 'https://kieai.erweima.ai/api/v1';
const KIEAI_AUTH_TOKEN = process.env.KIEAI_AUTH_TOKEN || '';

/**
 * =================================
 * 核心API调用函数
 * =================================
 */

/**
 * 调用Flux Kontext API - 统一接口
 * @param {Object} data - 请求数据
 * @param {string} endpoint - API端点 ('generate' 或 'record-info')
 */
async function callFluxKontextAPI(data, endpoint = 'generate') {
  const isRecordQuery = endpoint === 'record-info';
  const url = `${KIEAI_API_URL}/flux/kontext/${endpoint}`;

  const config = {
    method: isRecordQuery ? 'get' : 'post',
    maxBodyLength: Infinity,
    url: isRecordQuery ? `${url}?taskId=${data.taskId}` : url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    timeout: isRecordQuery ? 60000 : 120000, // 增加查询超时时间到60秒
    validateStatus: function (status) {
      return status < 500;
    }
  };

  if (!isRecordQuery) {
    config.data = JSON.stringify(data);
  }

  const maxRetries = isRecordQuery ? 2 : 2; // 查询和生成都只重试2次
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 调用Flux Kontext ${endpoint} API (尝试 ${attempt}/${maxRetries})`);
      if (!isRecordQuery) {
        console.log('📡 请求数据:', JSON.stringify(data, null, 2));
      }

      const response = await axios.request(config);
      console.log(`📡 Flux Kontext响应状态: ${response.status}`);
      console.log('📡 Flux Kontext响应数据:', JSON.stringify(response.data, null, 2));

      if (response.status === 200) {
        if (isRecordQuery) {
          // 查询状态的响应处理
          // Flux Kontext使用 code: 200 和 msg: "success" 来表示成功
          if ((response.data.success || (response.data.code === 200 && response.data.msg === 'success')) && response.data.data) {
            return response.data.data;
          } else {
            throw new Error(response.data.message || response.data.msg || '查询任务状态失败');
          }
        } else {
          // 生成任务的响应处理
          // Flux Kontext使用 code: 200 和 msg: "success" 来表示成功
          if ((response.data.success || (response.data.code === 200 && response.data.msg === 'success')) && response.data.data?.taskId) {
            console.log('✅ Flux Kontext任务创建成功，任务ID:', response.data.data.taskId);
            return response.data.data.taskId;
          } else {
            throw new Error(response.data.message || response.data.msg || '任务创建失败，缺少taskId');
          }
        }
      } else {
        throw new Error(response.data.message || response.data.msg || `HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      lastError = error;
      console.error(`❌ Flux Kontext ${endpoint} API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

      // 检查是否应该重试
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const isClientError = error.response && error.response.status >= 400 && error.response.status < 500;
      const shouldStop = attempt === maxRetries || (isClientError && !isTimeout);

      if (shouldStop) {
        break;
      }

      // 对超时错误使用较短的重试间隔
      const delay = isTimeout
        ? Math.min(2000 * attempt, 6000)
        : Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ ${isTimeout ? '超时' : '网络错误'}，${delay}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`Flux Kontext ${endpoint} API调用失败`);
}

/**
 * 调用GPT-4O API - 统一接口
 * @param {Object} data - 请求数据
 * @param {string} endpoint - API端点 ('generate' 或 'record-info')
 */
async function callGPT4OAPI(data, endpoint = 'generate') {
  const isRecordQuery = endpoint === 'record-info';
  const url = `${KIEAI_API_URL}/gpt4o-image/${endpoint}`;

  const config = {
    method: isRecordQuery ? 'get' : 'post',
    maxBodyLength: Infinity,
    url: isRecordQuery ? `${url}?taskId=${data.taskId}` : url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    timeout: isRecordQuery ? 60000 : 120000, // 增加查询超时时间到60秒
    validateStatus: function (status) {
      return status < 500;
    }
  };

  if (!isRecordQuery) {
    config.data = JSON.stringify(data);
  }

  const maxRetries = isRecordQuery ? 2 : 2; // 查询和生成都只重试2次
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎨 调用GPT-4O ${endpoint} API (尝试 ${attempt}/${maxRetries})`);
      if (!isRecordQuery) {
        console.log('🎨 请求数据:', JSON.stringify(data, null, 2));
      }

      const response = await axios.request(config);
      console.log(`🎨 GPT-4O响应状态: ${response.status}`);
      console.log('🎨 GPT-4O响应数据:', JSON.stringify(response.data, null, 2));

      if (response.status >= 400) {
        throw new Error(`GPT-4O API HTTP错误: ${response.status}`);
      }

      if (!response.data) {
        throw new Error('GPT-4O API返回空响应');
      }

      if (isRecordQuery) {
        // 查询状态的响应处理
        return response.data.data || response.data;
      } else {
        // 生成任务的响应处理
        if (response.data.msg === 'success' && response.data.data?.taskId) {
          console.log('✅ 获得TaskID (msg格式):', response.data.data.taskId);
          return response.data.data.taskId;
        } else if (response.data.code === 200 && response.data.data?.taskId) {
          console.log('✅ 获得TaskID (code格式):', response.data.data.taskId);
          return response.data.data.taskId;
        } else if (response.data.code) {
          // 处理错误码
          const errorMessages = {
            401: 'GPT-4O API未授权 - 请检查认证凭据',
            402: 'GPT-4O API积分不足',
            422: 'GPT-4O API参数错误 - 请检查prompt和其他参数',
            429: 'GPT-4O API请求限制',
            455: 'GPT-4O API服务不可用',
            500: 'GPT-4O API服务器错误'
          };

          const errorMsg = errorMessages[response.data.code] ||
            `GPT-4O API未知错误 - 状态码: ${response.data.code}`;

          if (response.data.code === 429 && attempt < maxRetries) {
            console.log(`⏳ API请求限制，等待${attempt * 5}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, attempt * 5000));
            continue;
          }

          throw new Error(errorMsg);
        } else {
          throw new Error(`GPT-4O API响应格式异常: ${JSON.stringify(response.data)}`);
        }
      }

    } catch (error) {
      lastError = error;
      console.error(`❌ GPT-4O ${endpoint} API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

      // 对于超时错误，在查询状态时应该重试，在创建任务时应该快速重试
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
      const shouldRetry = attempt < maxRetries &&
        !error.message.includes('API请求限制') &&
        (isTimeout || error.response?.status >= 500);

      if (shouldRetry) {
        // 超时错误使用较短的重试间隔
        const delay = isTimeout ? Math.min(2000 * attempt, 6000) : Math.min(3000 * attempt, 10000);
        console.log(`⏳ ${isTimeout ? '超时' : '服务器错误'}，${delay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`GPT-4O ${endpoint} API调用失败`);
}

/**
 * =================================
 * 图片处理工具函数
 * =================================
 */

/**
 * 处理图片URL，确保图片可公开访问
 * @param {string} imageUrl - 原始图片URL
 * @returns {string} - 公开可访问的图片URL
 */
async function processImageUrl(imageUrl) {
  if (!imageUrl) {
    throw new Error('图片URL不能为空');
  }

  // 检查是否是相对路径（本地图片）
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    console.log('检测到本地相对路径图片，需要上传到公开存储');

    // 相对路径，需要拼接服务器地址以便读取文件
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    const fullImageUrl = `${serverUrl}/${imageUrl}`;
    console.log('本地完整URL:', fullImageUrl);

    // 生成唯一的文件路径
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const uploadPath = `chenchaotao/images/${timestamp}_${randomId}.png`;

    // 直接上传到MinIO公开存储
    const publicImageUrl = await uploadStreamAndGetUrl(fullImageUrl, uploadPath);
    console.log('本地图片已上传到公开存储:', publicImageUrl);
    return publicImageUrl;
  }

  // 已经是完整的HTTP/HTTPS URL，检查是否可访问
  try {
    const testResponse = await axios.head(imageUrl, { timeout: 5000 });
    if (testResponse.status === 200) {
      console.log('图片URL已经是公开可访问的:', imageUrl);
      return imageUrl;
    } else {
      throw new Error('图片URL不可访问');
    }
  } catch (error) {
    console.log('外部图片URL不可访问，需要上传到公开存储:', error.message);

    // 生成唯一的文件路径
    const timestamp = Date.now();
    const randomId = uuidv4().split('-')[0];
    const uploadPath = `chenchaotao/images/${timestamp}_${randomId}.png`;

    // 上传到MinIO公开存储
    const publicImageUrl = await uploadStreamAndGetUrl(imageUrl, uploadPath);
    console.log('外部图片已上传到公开存储:', publicImageUrl);
    return publicImageUrl;
  }
}

/**
 * 直接下载图片并上传到分类公网存储（不保存本地）
 * @param {string} imageUrl - 图片URL
 * @param {string} imageType - 图片类型 ('TEXT_TO_IMAGE', 'IMAGE_COLORING', 'IMAGE_TO_IMAGE')
 * @param {string} filename - 文件名（可选）
 * @returns {Object} - 包含公网URL和存储信息的对象
 */
async function downloadAndUploadToPublic(imageUrl, imageType, filename = null) {
  const envConfig = getCurrentEnvConfig();

  try {
    if (envConfig.VERBOSE_LOGGING) {
      console.log(`📥 开始直接上传图片: ${imageUrl} -> ${imageType}`);
    }

    // 使用新的直接上传功能
    const result = await downloadAndUploadToCategory(imageUrl, imageType, filename);

    if (envConfig.VERBOSE_LOGGING) {
      console.log(`✅ 图片已直接上传到分类存储: ${result.publicUrl}`);
    }

    return result;

  } catch (error) {
    console.error('直接上传图片失败:', error);
    throw error;
  }
}

/**
 * 兼容性函数 - 保持向后兼容，但现在直接上传到公网
 * @param {string} imageUrl - 图片URL
 * @param {string} filename - 文件名
 * @param {string} imageType - 图片类型（新增参数）
 * @returns {Object} - 包含公网URL的对象
 */
async function downloadAndSaveImage(imageUrl, filename, imageType = 'TEXT_TO_IMAGE') {
  const result = await downloadAndUploadToPublic(imageUrl, imageType, filename);

  // 返回兼容格式
  return {
    localPath: null, // 不再保存本地
    publicUrl: result.publicUrl,
    filename: result.filename,
    storagePath: result.storagePath
  };
}

/**
 * 构建专业涂色页prompt
 * @param {string} aiPrompt - AI提示词（单张图片描述）
 * @param {string} generalPrompt - 通用提示词（文生图或图生图的全局描述）
 * @returns {string} - 专业的涂色页prompt
 */
function buildProfessionalColoringPagePrompt(aiPrompt, generalPrompt) {
  // 如果有用户自定义的通用提示词，使用用户的；否则使用默认的
  const defaultGeneralPrompt = 'coloring page style, black and white line art, simple line drawing, clean outlines, no shading, no fill, white background, suitable for coloring, cartoon style, vector art style, printable coloring page, kid-friendly design, clear line work, minimal details, bold outlines';

  const finalGeneralPrompt = generalPrompt && generalPrompt.trim() ? generalPrompt.trim() : defaultGeneralPrompt;

  return `${aiPrompt}。 ${finalGeneralPrompt}`;
}



/**
 * =================================
 * 主要图片生成功能
 * =================================
 */

/**
 * 文生图 - 根据文本生成图片
 * @param {Object} options - 生成选项
 * @param {string} options.aiPrompt - AI提示词（单张图片描述）
 * @param {string} options.text2imagePrompt - 文生图提示词（通用描述）
 * @param {string} options.apiType - API类型 ('gpt4o' 或 'flux-kontext')
 * @param {string} options.model - 模型名称（Flux时需要）
 * @param {string} options.imageRatio - 图片比例
 * @param {Function} options.progressCallback - 进度回调
 * @returns {Object} - 任务信息
 */
async function generateTextToImage({ aiPrompt, text2imagePrompt, apiType = 'gpt4o', model, imageRatio = '1:1', imageFormat = 'png', progressCallback }) {
  try {
    console.log('开始文生图任务');
    console.log('AI提示词 (单张图片描述):', aiPrompt);
    console.log('文生图提示词 (通用描述):', text2imagePrompt);
    console.log('API类型:', apiType);
    console.log('图片比例:', imageRatio);

    // 构建专业涂色页prompt - AI提示词 + 文生图提示词
    let professionalPrompt = buildProfessionalColoringPagePrompt(aiPrompt, text2imagePrompt);
    console.log(`🔧 专业prompt已构建，长度: ${professionalPrompt.length} 字符`);

    let taskId;
    if (apiType === 'flux-kontext') {
      // Flux Kontext支持的比例
      const supportedRatios = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', '16:21'];

      if (supportedRatios.includes(imageRatio)) {
        // 支持的比例，正常传递aspectRatio参数
        const requestData = {
          prompt: professionalPrompt,
          aspectRatio: imageRatio,
          model: model || 'flux-kontext-pro',
          callBackUrl: null,
          uploadCn: true,
          outputFormat: imageFormat || 'png',
        };
        taskId = await callFluxKontextAPI(requestData, 'generate');
      } else {
        // 不支持的比例，在prompt前面添加"landscape x:x"，不传递aspectRatio参数
        const landscapePrompt = `landscape ${imageRatio}, ${professionalPrompt}`;
        console.log(`🔧 Flux不支持比例${imageRatio}，在prompt前添加landscape描述`);

        const requestData = {
          prompt: landscapePrompt,
          // 不传递aspectRatio参数
          model: model || 'flux-kontext-pro',
          callBackUrl: null,
          uploadCn: true,
          outputFormat: imageFormat || 'png',
        };
        taskId = await callFluxKontextAPI(requestData, 'generate');
      }
    } else {
      // GPT-4O支持的比例
      const supportedRatios = ['1:1', '3:2', '2:3'];

      if (supportedRatios.includes(imageRatio)) {
        // 支持的比例，正常传递size参数
        const requestData = {
          prompt: professionalPrompt,
          size: imageRatio,
          nVariants: 1,
          isEnhance: false,
          uploadCn: true,
        };
        taskId = await callGPT4OAPI(requestData, 'generate');
      } else {
        // 不支持的比例，在prompt前面添加"landscape x:x"，不传递size参数
        const landscapePrompt = `landscape ${imageRatio}, ${professionalPrompt}`;
        console.log(`🔧 GPT-4O不支持比例${imageRatio}，在prompt前添加landscape描述`);

        const requestData = {
          prompt: landscapePrompt,
          // 不传递size参数
          nVariants: 1,
          isEnhance: false,
          uploadCn: true,
        };
        taskId = await callGPT4OAPI(requestData, 'generate');
      }
    }

    console.log(`📋 文生图任务创建成功，taskId: ${taskId}`);

    return {
      taskId: taskId,
      status: 'processing',
      message: `${apiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'}文生图任务已创建，正在处理中...`,
      apiType: apiType,
      type: 'text-to-image'
    };

  } catch (error) {
    console.error('文生图任务创建失败:', error);
    throw error;
  }
}

/**
 * 图生图 - 根据输入图片生成新图片
 * @param {Object} options - 生成选项
 * @param {string} options.imageUrl - 输入图片URL
 * @param {string} options.aiPrompt - AI提示词（单张图片描述）
 * @param {string} options.image2imagePrompt - 图生图提示词（通用描述）
 * @param {string} options.apiType - API类型
 * @param {string} options.model - 模型名称
 * @param {string} options.imageRatio - 图片比例
 * @returns {Object} - 任务信息
 */
async function generateImageToImage({ imageUrl, aiPrompt, image2imagePrompt, apiType = 'gpt4o', model, imageRatio = '1:1', imageFormat = 'png' }) {
  try {
    console.log('开始图生图任务');
    console.log('输入图片URL:', imageUrl);
    console.log('AI提示词 (单张图片描述):', aiPrompt);
    console.log('图生图提示词 (通用描述):', image2imagePrompt);
    console.log('API类型:', apiType);

    // 处理输入图片URL
    const publicImageUrl = await processImageUrl(imageUrl);

    // 构建专业prompt - AI提示词 + 图生图提示词
    const professionalPrompt = image2imagePrompt;

    let taskId;
    if (apiType === 'flux-kontext') {
      // Flux Kontext支持的比例
      const supportedRatios = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', '16:21'];

      if (supportedRatios.includes(imageRatio)) {
        // 支持的比例，正常传递aspectRatio参数
        const requestData = {
          inputImage: publicImageUrl,
          prompt: professionalPrompt,
          aspectRatio: imageRatio,
          model: model || 'flux-kontext-pro',
          callBackUrl: null,
          uploadCn: true,
          outputFormat: imageFormat || 'png'
        };
        taskId = await callFluxKontextAPI(requestData, 'generate');
      } else {
        // 不支持的比例，在prompt前面添加"landscape x:x"，不传递aspectRatio参数
        const landscapePrompt = `landscape ${imageRatio}, ${professionalPrompt}`;
        console.log(`🔧 Flux图生图不支持比例${imageRatio}，在prompt前添加landscape描述`);

        const requestData = {
          inputImage: publicImageUrl,
          prompt: landscapePrompt,
          // 不传递aspectRatio参数
          model: model || 'flux-kontext-pro',
          callBackUrl: null,
          uploadCn: true,
          outputFormat: imageFormat || 'png'
        };
        taskId = await callFluxKontextAPI(requestData, 'generate');
      }
    } else {
      // GPT-4O支持的比例
      const supportedRatios = ['1:1', '3:2', '2:3'];

      if (supportedRatios.includes(imageRatio)) {
        // 支持的比例，正常传递size参数
        const requestData = {
          filesUrl: [publicImageUrl],
          prompt: professionalPrompt,
          size: imageRatio,
          callBackUrl: null,
          isEnhance: false,
          uploadCn: true,
          nVariants: 1,
          enableFallback: false
        };
        taskId = await callGPT4OAPI(requestData, 'generate');
      } else {
        // 不支持的比例，在prompt前面添加"landscape x:x"，不传递size参数
        const landscapePrompt = `landscape ${imageRatio}, ${professionalPrompt}`;
        console.log(`🔧 GPT-4O图生图不支持比例${imageRatio}，在prompt前添加landscape描述`);

        const requestData = {
          filesUrl: [publicImageUrl],
          prompt: landscapePrompt,
          // 不传递size参数
          callBackUrl: null,
          isEnhance: false,
          uploadCn: true,
          nVariants: 1,
          enableFallback: false
        };
        taskId = await callGPT4OAPI(requestData, 'generate');
      }
    }

    console.log(`📋 图生图任务创建成功，taskId: ${taskId}`);

    return {
      taskId: taskId,
      status: 'processing',
      message: `${apiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'}图生图任务已创建，正在处理中...`,
      apiType: apiType,
      type: 'image-to-image',
      inputImageUrl: publicImageUrl
    };

  } catch (error) {
    console.error('图生图任务创建失败:', error);
    throw error;
  }
}

/**
 * 图片上色 - 为黑白图片生成彩色版本
 * @param {Object} options - 上色选项
 * @param {string} options.imageUrl - 图片URL
 * @param {string} options.prompt - 上色prompt
 * @param {string} options.apiType - API类型
 * @param {string} options.model - 模型名称
 * @returns {Object} - 任务信息
 */
async function generateColoredImage({ imageUrl, prompt, coloringPrompt, apiType = 'gpt4o', model, imageRatio = '1:1', imageFormat = 'png' }) {
  try {
    console.log('开始图片上色任务');
    console.log('原始图片URL:', imageUrl);
    console.log('上色prompt:', prompt);
    console.log('用户自定义上色提示词:', coloringPrompt);
    console.log('API类型:', apiType);

    // 处理图片URL并上传到公开存储
    const publicImageUrl = await processImageUrl(imageUrl);

    // 构造上色prompt - 优先使用用户自定义的coloringPrompt
    let colorPrompt;
    if (coloringPrompt) {
      // 如果用户提供了自定义上色提示词，直接使用
      colorPrompt = coloringPrompt;
    } else {
      // 如果用户没有提供，使用默认的上色提示词
      colorPrompt = '用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明';
    }

    console.log('🎨 最终上色prompt:', colorPrompt);

    let taskId;
    if (apiType === 'flux-kontext') {
      // Flux Kontext上色
      const requestData = {
        inputImage: publicImageUrl,
        prompt: colorPrompt,
        aspectRatio: imageRatio,
        model: model || 'flux-kontext-pro',
        callBackUrl: null,
        uploadCn: true,
        outputFormat: imageFormat || 'png'
      };
      taskId = await callFluxKontextAPI(requestData, 'generate');
    } else {
      // GPT-4O上色
      const requestData = {
        filesUrl: [publicImageUrl],
        prompt: colorPrompt,
        size: '1:1',
        callBackUrl: null,
        isEnhance: false,
        uploadCn: true,
        nVariants: 1,
        enableFallback: false
      };
      taskId = await callGPT4OAPI(requestData, 'generate');
    }

    console.log(`📋 图片上色任务创建成功，taskId: ${taskId}`);

    return {
      taskId: taskId,
      status: 'processing',
      message: `${apiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'}上色任务已创建，正在处理中...`,
      publicImageUrl: publicImageUrl,
      apiType: apiType,
      type: 'image-coloring'
    };

  } catch (error) {
    console.error('图片上色任务创建失败:', error);
    throw error;
  }
}

/**
 * =================================
 * 任务状态查询
 * =================================
 */

/**
 * 检查任务状态 - 统一接口
 * @param {string} taskId - 任务ID
 * @param {string} apiType - API类型
 * @returns {Object} - 任务状态信息
 */
async function checkTaskStatus(taskId, apiType = 'gpt4o') {
  try {
    // 根据taskId自动识别API类型（如果没有明确指定）
    let actualApiType = apiType;
    if (taskId.startsWith('fluxkontext_')) {
      actualApiType = 'flux-kontext';
    } else if (taskId.includes('gpt') || taskId.length > 30) {
      actualApiType = 'gpt4o';
    }

    console.log(`🔍 查询任务状态: ${taskId} (${actualApiType})`);

    let taskStatus;
    if (actualApiType === 'flux-kontext') {
      taskStatus = await callFluxKontextAPI({ taskId }, 'record-info');
    } else {
      taskStatus = await callGPT4OAPI({ taskId }, 'record-info');
    }

    return processTaskStatus(taskStatus, actualApiType);

  } catch (error) {
    console.error('查询任务状态失败:', error);

    // 对超时错误进行特殊处理
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn(`⚠️ 任务状态查询超时: ${taskId}, 可能任务仍在处理中`);
      // 返回一个"处理中"状态而不是抛出错误
      return {
        status: 'processing',
        progress: 0.5,
        message: `任务状态查询超时，任务可能仍在处理中...`,
        completed: false,
        timeout: true // 标记为超时
      };
    }

    throw error;
  }
}

/**
 * 处理任务状态响应
 * @param {Object} taskStatus - 原始任务状态
 * @param {string} apiType - API类型
 * @returns {Object} - 标准化的任务状态
 */
function processTaskStatus(taskStatus, apiType) {
  if (apiType === 'flux-kontext') {
    // Flux Kontext状态处理
    // 根据官方文档，应检查 resultImageUrl 字段来判断任务是否完成
    console.log('Flux Kontext任务状态数据:', JSON.stringify(taskStatus, null, 2));

    if (taskStatus.response?.resultImageUrl) {
      // 如果有 response.resultImageUrl，说明任务已完成
      return {
        status: 'completed',
        progress: 1.0,
        message: 'Flux Kontext任务完成',
        imageUrl: taskStatus.response.resultImageUrl,
        completed: true
      };
    } else if (taskStatus.status !== undefined) {
      // 如果有明确的错误状态
      switch (taskStatus.status) {
        case 2:
        case 3:
          return {
            status: 'failed',
            progress: 0,
            message: `Flux Kontext任务失败: 状态${taskStatus.status}`,
            error: `任务失败，状态码: ${taskStatus.status}`,
            completed: true
          };
        default:
          // 其他情况都认为是处理中
          return {
            status: 'processing',
            progress: 0.5,
            message: 'Flux Kontext任务处理中...',
            completed: false
          };
      }
    } else {
      // 没有 resultImageUrl 也没有明确状态，认为还在处理中
      return {
        status: 'processing',
        progress: 0.5,
        message: 'Flux Kontext任务处理中...',
        completed: false
      };
    }
  } else {
    // GPT-4O状态处理
    console.log('GPT-4O任务状态数据:', JSON.stringify(taskStatus, null, 2));

    // 处理data为null的情况
    if (taskStatus.data === null) {
      return {
        status: 'failed',
        progress: 0,
        message: 'GPT-4O任务失败: 任务不存在或已过期',
        error: '任务不存在或已过期',
        completed: true
      };
    }

    // 检查是否有data字段且data不为null
    const actualStatus = taskStatus.data || taskStatus;

    switch (actualStatus.status) {
      case 'SUCCESS':
        let imageUrl = null;
        if (actualStatus.response?.resultUrls?.length > 0) {
          imageUrl = actualStatus.response.resultUrls[0];
        }
        return {
          status: 'completed',
          progress: 1.0,
          message: 'GPT-4O任务完成',
          imageUrl: imageUrl,
          completed: true
        };

      case 'GENERATING':
        const progress = parseFloat(actualStatus.progress || '0');
        return {
          status: 'processing',
          progress: progress,
          message: `GPT-4O任务处理中... 进度: ${(progress * 100).toFixed(1)}%`,
          completed: false
        };

      case 'CREATE_TASK_FAILED':
      case 'GENERATE_FAILED':
        return {
          status: 'failed',
          progress: 0,
          message: `GPT-4O任务失败: ${actualStatus.errorMessage || '未知错误'}`,
          error: actualStatus.errorMessage || '任务失败',
          completed: true
        };

      default:
        // 如果没有明确的状态，认为还在处理中
        return {
          status: 'processing',
          progress: parseFloat(actualStatus.progress || '0'),
          message: `GPT-4O任务状态: ${actualStatus.status || '未知'}`,
          completed: false
        };
    }
  }
}

/**
 * =================================
 * 完整的任务处理流程
 * =================================
 */

/**
 * 完整的图片生成流程（包含轮询和下载）
 * @param {Object} options - 生成选项
 * @param {string} options.type - 任务类型 ('text-to-image', 'image-to-image', 'image-coloring')
 * @param {string} options.aiPrompt - AI提示词（单张图片描述）
 * @param {string} options.text2imagePrompt - 文生图提示词（通用描述，可选）
 * @param {string} options.image2imagePrompt - 图生图提示词（通用描述，可选）
 * @param {Function} options.progressCallback - 进度回调
 * @returns {string} - 本地图片路径
 */
async function completeImageGeneration(options) {
  const { type, progressCallback, ...generationOptions } = options;

  try {
    // 1. 创建任务
    let taskInfo;
    switch (type) {
      case 'text-to-image':
        taskInfo = await generateTextToImage({ ...generationOptions, progressCallback });
        break;
      case 'image-to-image':
        taskInfo = await generateImageToImage(generationOptions);
        break;
      case 'image-coloring':
        taskInfo = await generateColoredImage(generationOptions);
        break;
      default:
        throw new Error(`不支持的任务类型: ${type}`);
    }

    const { taskId, apiType } = taskInfo;

    // 2. 轮询任务状态
    // Flux Kontext 通常在6-10秒内完成，GPT-4O需要更长时间
    const maxAttempts = apiType === 'flux-kontext' ? 60 : 100; // Flux: 3分钟, GPT-4O: 5分钟
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Flux Kontext 使用更短的轮询间隔，因为它生成速度更快
      const delay = apiType === 'flux-kontext'
        ? (attempts < 3 ? 2000 : (attempts < 10 ? 3000 : 5000))  // 2s -> 3s -> 5s
        : (attempts < 6 ? 3000 : (attempts < 12 ? 5000 : 8000)); // 3s -> 5s -> 8s

      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;

      try {
        const status = await checkTaskStatus(taskId, apiType);

        console.log(`🔍 任务状态查询 (${attempts}/${maxAttempts}, ${apiType}):`, {
          taskId: taskId,
          status: status.status,
          completed: status.completed,
          hasImageUrl: !!status.imageUrl,
          progress: status.progress
        });

        if (progressCallback) {
          progressCallback(Math.round(status.progress * 100));
        }

        if (status.completed) {
          if (status.status === 'completed' && status.imageUrl) {
            // 3. 根据任务类型确定图片分类
            let imageType;
            switch (type) {
              case 'text-to-image':
                imageType = 'TEXT_TO_IMAGE';
                break;
              case 'image-to-image':
                imageType = 'IMAGE_TO_IMAGE';
                break;
              case 'image-coloring':
                imageType = 'IMAGE_COLORING';
                break;
              default:
                imageType = 'TEXT_TO_IMAGE';
            }

            // 直接上传到分类存储
            const filename = `${type}_${Date.now()}_${uuidv4().split('-')[0]}.png`;
            const uploadResult = await downloadAndUploadToPublic(status.imageUrl, imageType, filename);

            if (progressCallback) progressCallback(100);

            // 返回包含公网URL和存储信息的对象
            return {
              localPath: null, // 不再保存本地
              publicUrl: uploadResult.publicUrl,
              filename: uploadResult.filename,
              storagePath: uploadResult.storagePath,
              imageType: uploadResult.imageType
            };
          } else if (status.status === 'failed') {
            throw new Error(status.error || '任务失败');
          }
        }

      } catch (statusError) {
        console.warn(`查询任务状态失败 (${attempts}/${maxAttempts}):`, statusError.message);

        // 检查是否是网络相关错误
        const isNetworkError = statusError.code === 'ECONNABORTED' ||
          statusError.message.includes('timeout') ||
          statusError.message.includes('ECONNRESET') ||
          statusError.message.includes('ETIMEDOUT') ||
          statusError.message.includes('ENOTFOUND') ||
          statusError.message.includes('ECONNREFUSED');

        // 如果是网络错误且还有重试机会，继续尝试
        if (isNetworkError && attempts < maxAttempts) {
          console.log(`🔄 网络错误，继续轮询 (${attempts}/${maxAttempts})`);
          continue;
        }

        // 对于非网络错误，如果超过一半尝试次数或已经到达最大次数，抛出异常
        if (!isNetworkError || attempts >= maxAttempts) {
          console.error(`❌ 轮询失败，不再重试 (${attempts}/${maxAttempts})`);
          throw statusError;
        }
      }
    }

    const timeoutMessage = apiType === 'flux-kontext'
      ? '任务处理超时（3分钟）'
      : '任务处理超时（5分钟）';
    throw new Error(timeoutMessage);

  } catch (error) {
    console.error(`${type}任务处理失败:`, error);
    throw error;
  }
}

// 导出所有功能
module.exports = {
  // 主要功能
  generateTextToImage,
  generateImageToImage,
  generateColoredImage,
  completeImageGeneration,

  // 任务状态查询
  checkTaskStatus,

  // API调用函数
  callFluxKontextAPI,

  // 工具函数
  processImageUrl,
  downloadAndSaveImage, // 兼容性函数
  downloadAndUploadToPublic, // 新的直接上传函数
  buildProfessionalColoringPagePrompt,

  // 向后兼容的函数名
  checkColoringTaskStatus: checkTaskStatus
}; 