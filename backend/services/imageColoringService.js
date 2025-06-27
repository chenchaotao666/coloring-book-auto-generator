const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { uploadStreamAndGetUrl } = require('../config/oss.config');

// 配置 - 你需要根据实际情况修改这些配置
const KIEAI_API_URL = process.env.KIEAI_API_URL || 'https://kieai.erweima.ai/api/v1';
const KIEAI_AUTH_TOKEN = process.env.KIEAI_AUTH_TOKEN || '';

/**
 * 调用AI服务生成上色图片
 * 参考colobook-0609中的img2imggenerateImages函数
 */
async function img2colorgenerateImages(data) {
  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/generate`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    data: JSON.stringify(data)
  };

  try {
    console.log('上色图片生成配置:', config);
    const response = await axios.request(config);
    console.log('上色图片生成响应:', response.data);

    // 根据响应码处理不同的情况
    switch (response.data.code) {
      case 200:
        return response.data;
      case 401:
        throw new Error('未授权 - 缺少身份验证凭据或凭据无效');
      case 402:
        throw new Error('积分不足 - 账户没有足够的积分执行此操作');
      case 404:
        throw new Error('未找到 - 请求的资源或端点不存在');
      case 422:
        throw new Error('参数错误 - 请求参数未通过验证检查');
      case 429:
        throw new Error('超出限制 - 已超过对此资源的请求限制');
      case 455:
        throw new Error('服务不可用 - 系统当前正在进行维护');
      case 500:
        throw new Error('服务器错误 - 在处理请求时发生意外错误');
      case 505:
        throw new Error('功能已禁用 - 请求的功能当前已禁用');
      default:
        throw new Error(`未知错误 - 状态码: ${response.data.code}`);
    }
  } catch (error) {
    console.error('上色图片生成错误:', error);
    throw error;
  }
}

/**
 * 生成上色图片的主函数
 */
async function generateColoredImage({ imageUrl, prompt, options = {} }) {
  try {
    console.log('开始生成上色图片');
    console.log('原始图片URL:', imageUrl);

    // 步骤1: 处理图片URL并上传到公开存储
    let publicImageUrl;

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
      const uploadPath = `chenchaotao/sketch/${timestamp}_${randomId}.png`;

      // 直接上传到MinIO公开存储
      publicImageUrl = await uploadStreamAndGetUrl(fullImageUrl, uploadPath);
      console.log('本地图片已上传到公开存储:', publicImageUrl);

    } else {
      // 已经是完整的HTTP/HTTPS URL，检查是否可访问
      try {
        const testResponse = await axios.head(imageUrl, { timeout: 5000 });
        if (testResponse.status === 200) {
          console.log('图片URL已经是公开可访问的:', imageUrl);
          publicImageUrl = imageUrl;
        } else {
          throw new Error('图片URL不可访问');
        }
      } catch (error) {
        console.log('外部图片URL不可访问，需要上传到公开存储:', error.message);

        // 生成唯一的文件路径
        const timestamp = Date.now();
        const randomId = uuidv4().split('-')[0];
        const uploadPath = `chenchaotao/sketch/${timestamp}_${randomId}.png`;

        // 上传到MinIO公开存储
        publicImageUrl = await uploadStreamAndGetUrl(imageUrl, uploadPath);
        console.log('外部图片已上传到公开存储:', publicImageUrl);
      }
    }

    // 步骤2: 构造请求数据
    const requestData = {
      filesUrl: [publicImageUrl], // 使用公开可访问的URL
      prompt: prompt,
      size: options.ratio || '1:1',
      callBackUrl: options.callBackUrl || null,
      isEnhance: options.isEnhance || false,
      uploadCn: options.uploadCn || false,
      nVariants: options.nVariants || 1,
      enableFallback: options.enableFallback || false
    };

    console.log('上色请求数据:', requestData);

    // 步骤3: 调用AI服务
    const response = await img2colorgenerateImages(requestData);

    if (response?.data?.taskId) {
      console.log('上色任务创建成功，taskId:', response.data.taskId);

      return {
        taskId: response.data.taskId,
        status: 'processing',
        message: '上色任务已创建，正在处理中...',
        publicImageUrl: publicImageUrl // 返回上传后的公开URL
      };
    } else {
      throw new Error('无效的响应格式，未找到taskId');
    }

  } catch (error) {
    console.error('生成上色图片失败:', error);
    throw error;
  }
}

/**
 * 检查上色任务状态
 * 参考colobook-0609中的getRecordInfo函数
 */
async function checkColoringTaskStatus(taskId) {
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/record-info?taskId=${taskId}`,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    }
  };

  try {
    const response = await axios.request(config);

    // 检查错误码
    if (response.data.errorCode) {
      switch (response.data.errorCode) {
        case 400:
          throw new Error('内容违规 - 图片内容违反了内容政策');
        case 451:
          throw new Error('下载失败 - 无法从提供的URL下载图片');
        default:
          throw new Error(`未知错误 - 错误码: ${response.data.errorCode}`);
      }
    }

    // 处理响应状态
    switch (response.status) {
      case 200:
        console.log('获取上色任务状态成功:', response.data.data.progress);
        break;
      default:
        throw new Error(`请求失败 - 状态码: ${response.status}`);
    }

    const taskData = response.data.data;
    console.log('AI服务返回的完整任务数据:', JSON.stringify(taskData, null, 2));

    // 检查任务是否完成 - 修改判断逻辑
    if (taskData.progress === '1.00') {
      console.log('进度已达到100%，处理结果...');
      console.log('任务状态:', taskData);

      // 检查是否有结果数据
      if (taskData.response && taskData.response.resultUrls) {
        const resultUrls = taskData.response.resultUrls;
        const originalColoringUrl = resultUrls && resultUrls.length > 0 ?
          resultUrls[0].match(/"(.*?)"/)?.[1] || resultUrls[0] : null;

        if (!originalColoringUrl) {
          console.error('未找到生成的彩色图片URL, resultUrls:', resultUrls);
          return {
            taskId: taskData.taskId,
            status: 'failed',
            progress: 100,
            message: '未找到生成的彩色图片URL',
            createdAt: new Date(taskData.createTime).toISOString()
          };
        }

        console.log('原始彩色图片URL:', originalColoringUrl);

        // 将彩色图片上传到公网存储
        let finalColoringUrl;
        try {
          // 生成唯一的文件路径
          const timestamp = Date.now();
          const randomId = uuidv4().split('-')[0];
          const uploadPath = `chenchaotao/coloring/${timestamp}_${randomId}.png`;

          // 上传彩色图片到MinIO
          finalColoringUrl = await uploadStreamAndGetUrl(originalColoringUrl, uploadPath);
          console.log('彩色图片已上传到公网存储:', finalColoringUrl);
        } catch (uploadError) {
          console.error('上传彩色图片失败:', uploadError);
          // 如果上传失败，使用原始URL
          finalColoringUrl = originalColoringUrl;
        }

        return {
          taskId: taskData.taskId,
          status: 'completed',
          progress: 100,
          coloringUrl: finalColoringUrl,
          originalColoringUrl: originalColoringUrl, // 保留原始URL
          completedAt: new Date(taskData.completeTime).toISOString(),
          message: '上色完成'
        };
      } else {
        // 进度100%但没有结果，说明生成失败
        console.log('进度100%但没有结果数据，任务失败');
        return {
          taskId: taskData.taskId,
          status: 'failed',
          progress: 100,
          message: '生成失败 - 没有结果数据',
          createdAt: new Date(taskData.createTime).toISOString()
        };
      }
    } else {
      // 返回当前状态
      let status = 'processing';
      let message = '正在处理中...';

      switch (taskData.status) {
        case 'GENERATING':
          status = 'processing';
          message = '正在生成中...';
          break;
        case 'CREATE_TASK_FAILED':
          status = 'failed';
          message = '任务创建失败';
          break;
        case 'GENERATE_FAILED':
          status = 'failed';
          message = '生成失败';
          break;
        default:
          status = 'unknown';
          message = `未知状态: ${taskData.status}`;
      }

      return {
        taskId: taskData.taskId,
        status: status,
        progress: Math.round(parseFloat(taskData.progress) * 100),
        message: message,
        createdAt: new Date(taskData.createTime).toISOString()
      };
    }

  } catch (error) {
    console.error(`检查上色任务状态失败 taskId: ${taskId}:`, error.message);
    throw error;
  }
}

module.exports = {
  generateColoredImage,
  checkColoringTaskStatus,
  img2colorgenerateImages
}; 