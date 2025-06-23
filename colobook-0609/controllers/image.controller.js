const { uploadImages, getImagesByUserId, getImageById, updateImageById, deleteImageById, img2imggenerateImages, getRecordInfo, getDownloadUrl} = require('../services/image.service');
const { handleGetImages,  handleImageTaskId_Update,  getCategoriesServices} = require('../services/image.service');


const { handleReportImage } = require('../services/report.service');
//用户举报照片
//输入：imageID， 用户ID 
//输出：返回结果，不能重复举报，不许举报不存在的照片
exports.reportImage = async (req, res, next) => {
  try {
    const userId = req.user; // 从JWT Token中获取用户ID
    const reportData = req.body;

    await handleReportImage(userId, reportData);

    res.status(200).json({ status: 'success' });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};



///################三大核心功能##########
/* 创建一个新的4o图像生成任务。生成的图片保存14天，14天后过期。 */
/* 
filesUrl
uri[]
(可选)文件URL列表，例如图片URL列表。最多支持5张图片。支持的文件格式：.jfif、.pjpeg、.jpeg、.pjp、.jpg、.png、.webp

Example: ["https://example.com/image1.png","https://example.com/image2.jpg"]
prompt
string
（可选）提示词，用于描述你希望4o image生成的内容。fileUrl/filesUrl和prompt至少需要提供一个

Example: A beautiful sunset over the mountains
size
string
required
（必填）图片尺寸比例，必须是支持的格式之一

Possible values: [1:1, 3:2, 2:3]

Example: 1:1
callBackUrl
uri
（可选）回调地址，用于接收4o image任务完成后的回调通知

Example: https://your-callback-url.com/callback
isEnhance
boolean
（可选）提示增强选项，默认值为 false。在大多数情况下，启用此功能是不必要的。但是，对于生成 3D 图像等特定场景，启用它可以产生更精细的效果。谨慎使用。

Example: false
uploadCn
boolean
（可选）指定图片上传的服务器区域。设置为 true 时使用中国大陆服务器，false 时使用海外服务器。可根据您的地理位置选择最优的上传节点以获得更好的上传速度。

Example: false
nVariants
integer
（可选）生成图片的变体数量。仅接受值 1、2 或 4。默认值为 1。根据官网政策变动，将来可能会有变动。

Possible values: [1, 2, 4]

Example: 1
enableFallback
boolean
（可选）是否启用托底机制。当设置为 true 时，如果官方 GPT-4o 图像生成服务不可用或出现异常，系统将自动切换到备用模型（如 Flux 等）进行图像生成，以确保任务的连续性和可靠性。默认值为 false。

Example: false */

exports.handleCallback = async (req, res, next) => {
  try {
    const { code, msg, data } = req.body;
    console.log('Received callback:', { code, msg, data });

    // 根据状态码处理不同的情况
    switch (code) {
      case 200:
        console.log('Image generation completed successfully:', data.info.result_urls);
        // 在这里添加处理成功逻辑，例如存储结果URL或通知用户
        break;
      case 400:
        console.error('Content policy violation:', msg);
        // 在这里添加处理违规逻辑
        break;
      case 451:
        console.error('Failed to download image:', msg);
        // 在这里添加处理下载失败逻辑
        break;
      default:
        console.error('Unknown callback status:', code, msg);
    }

    res.status(200).json({ status: 'Callback received' });
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
///////////////////本来要用上面的callback，但是没写，先用这个，后面再改
/* const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      const { address, family, internal } = interface;
      if (family === 'IPv4' && !internal) {
        return address;
      }
    }
  }
  return null;
}

const localIp = getLocalIp();
console.log('本地 IP 地址:', localIp); 

callback 这么用：  callBackUrl: 'https://localIp：3000/api/images/callback', // 直接使用固定的回调 URL

*/

/* 
exports.img2imgGenerate = async (req, res) => {
  try {

    const data = req.body;
    let filesUrl = [];

    // 检查是否有文件上传
    if (req.file) {
      const newImage = await uploadImages(req);
      filesUrl.push(newImage.defaultUrl);

      // 构造新的参数
      const newData = {
        filesUrl,
        prompt: `${data.prompt}，key，word`, // 合并 prompt
        size: data.ratio,
        callBackUrl: data.callBackUrl,
        isEnhance: data.isEnhance || false,
        uploadCn: data.uploadCn || false,
        nVariants: data.nVariants || 1,    //三种，可以是1，2，4
        enableFallback: data.enableFallback || false   //（可选）是否启用托底机制。当设置为 true 时，如果官方 GPT-4o 图像生成服务不可用或出现异常，系统将自动切换到备用模型（如 Flux 等）进行图像生成，以确保任务的连续性和可靠性。默认值为 false。
        
      };

      // 调用图片生成服务
      const response = await img2imggenerateImages(newData);
        //这里要考虑报错情况
      console.log('img2imggenerateImages response:', response.data);

      
      // 根据 uploadResult.imageUrl，查找图片 ID，并更新 taskId，这里是不得已而为之，如果用callback 就不用麻烦了，但是callback 要又ip地址才行
      const taskId = response.data.data.taskId;
      //await handleImageTaskIdUpdate(newImage.defaultUrl, taskId);
      await handleImageTaskId_Update(newImage.id, taskId);
    } 
    else
    {
      //没有文件上传，直接报错
      res.status(500).json({
      status: 'error',
      message: error.message
      });
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
 */

exports.img2imgGenerate = async (req, res) => {
  try {
    console.log('img2imgGenerate function started');
    const data = req.body;
    console.log('Received request body:', data);
    let filesUrl = [];

    console.log('Checking for uploaded files');
    if (req.files) {
      console.log('Files found in request');
      console.log('req.files', req.files);
      const newImage = await uploadImages(req);
      console.log('New image uploaded with defaultUrl:', newImage.defaultUrl);
      filesUrl.push(newImage.defaultUrl);

      console.log('Constructing new parameters for image generation');
      const newData = {
        filesUrl,
        prompt: `${data.prompt}，key，word`, // 合并 prompt
        size: data.ratio,
        callBackUrl: data.callBackUrl,
        isEnhance: data.isEnhance || false,
        uploadCn: data.uploadCn || false,
        nVariants: data.nVariants || 1,    //三种，可以是1，2，4
        enableFallback: data.enableFallback || false   //（可选）是否启用托底机制。当设置为 true 时，如果官方 GPT-4o 图像生成服务不可用或出现异常，系统将自动切换到备用模型（如 Flux 等）进行图像生成，以确保任务的连续性和可靠性。默认值为 false。
      };
      console.log('Constructed newData:', newData);

      console.log('Calling img2imggenerateImages service');
      const response = await img2imggenerateImages(newData);
      console.log('img2imggenerateImages response received:', response);

      // 检查 response.data 是否存在以及是否有 taskId
      if (response && response.data && response.data.taskId) {
        console.log('Extracting taskId from response:', response.data.taskId);
        const taskId = response.data.taskId;

        console.log('Updating image taskId');
        await handleImageTaskId_Update(newImage.id, taskId);
        console.log('Image taskId updated successfully');

        console.log('Constructing success response');
        const successResponse = {
          status: 'success',
          data: {
            taskId: taskId,
            // 其他需要返回的数据可以在这里添加
          }
        };

        console.log('Sending successful response');
        res.status(200).json(successResponse);
      } else {
        console.error('Invalid response format, taskId not found:', response);
        throw new Error('Invalid response format, taskId not found');
      }
    } else {
      console.log('No files found in request');
      const error = new Error('No files uploaded');
      console.error('Request failed due to missing files', error);
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  } catch (error) {
    console.error('Error in img2imgGenerate function:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.text2imgGenerate = async (req, res) => {
  try {

    const data = req.body;
    let filesUrl = [];
    
    if (req.file) {
      //调用错了接口，直接返回失败
          res.status(500).json({
                status: 'error',
                message: error.message
              });

    }

    // 构造新的参数
    const newData = {
      filesUrl: null,// 没有文件上传，这里是空
      prompt: `${data.prompt}，key，word`, // 合并 prompt
      size: data.ratio,
      callBackUrl: data.callBackUrl,
      isEnhance: data.isEnhance || false,
      uploadCn: data.uploadCn || false,
      nVariants: data.nVariants || 1
    };

  
    const response = await img2imggenerateImages(newData);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};


//用户查询任务状态，
//输入：从提交任务时获得的任务id，也就是taskId
//输出：
//说明：



exports.getRecordInfo = async (req, res) => {
  try {
    const { taskId } = req.query;
    const userId = req.user.id; // 从 JWT Token 中获取 user_id
    const response = await getRecordInfo(taskId, userId); // 传递 user_id
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getDownloadUrl = async (req, res) => {
  try {
    const data = req.body;
    const response = await getDownloadUrl(data);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};




//////////////////////////查找整个空间的信息，放在这里吧///////
/* **接口地址:** `GET /api/images/`
**接口描述:** 查询图片，支持多种筛选条件和分页
**查询参数:**

| 参数        | 类型    | 必填 | 说明                   | 默认值                 |
| ----------- | ------- | ---- | ---------------------- | ---------------------- |
| imageId     | string  | 否   | 图片ID（查询单张图片） | -                      |
| query       | string  | 否   | 搜索关键词             | -                      |
| categoryId    | string  | 否   | 分类筛选               | 大类，如漫威宇宙-                      |
| tags        | string  | 否   | 标签筛选（逗号分隔）   | -  小类，钢铁侠，蜘蛛侠                    |
| ratio       | string  | 否   | 图片比例1:1            | 1:1/3:4/4:3            |
| type        | string  | 否   | 图片类型               | text2image/image2image |
| userId      | string  | 否   | 用户ID筛选             | -                      |
| isPublic    | boolean | 否   | 是否公开               | -                      |
| currentPage | number  | 否   | 当前页码               | 1                      |
| pageSize    | number  | 否   | 每页数量               | 20                     |
| isRelated   | boolean | 否   | 是否推荐相关图片       | false                  |

**请求示例:**
```bash
# 查询单张图片
GET /api/images?imageId=cat

# 搜索图片
GET /api/images?query=cat&categoryId=animals&currentPage=1&pageSize=10

# 获取相关推荐
GET /api/images?imageId=cat&isRelated=true

# 按标签筛选
GET /api/images?tags=cute,pet&ratio=1:1&isPublic=true
*/


exports.getImages = async (req, res, next) => {
  try {
    console.log('getImages function started');
    const result = await handleGetImages(req);
    res.status(200).json({
      status: 'success',
      data: {
        images: result.images,
        total: result.total
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};



///////////这里是用户的工作空间，用户上传一张图片，有四个诉求 1. 实体进入网盘存储 2. 内容进入数据库 3. 界面显示出来 4. 获取到网盘存储的url

exports.uploadImage = async (req, res) => {
  try {
    const image = await uploadImages(req.user._id, req.body.image);
    handleResponse(image, res, 201);
  } catch (error) {
    handleError(error, res);
  }
};



exports.getImages_old = async (req, res) => {
  try {
    const images = await getImagesByUserId(req.user._id);
    handleResponse(images, res);
  } catch (error) {
    handleError(error, res);
  }
};



exports.getImage = async (req, res) => {
  try {
    const image = await getImageById(req.params.id);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }
    handleResponse(image, res);
  } catch (error) {
    handleError(error, res);
  }
};

exports.updateImage = async (req, res) => {
  try {
    const image = await updateImageById(req.params.id, req.body.image);
    if (!image) {
      return res.status(404).json({
        status: 'error',
        message: '图片不存在'
      });
    }
    handleResponse(image, res);
  } catch (error) {
    handleError(error, res);
  }
};


//用户删除照片，只能删除自己创建的照片
//输入：用户imageID 
//输出：返回结果




// 通用错误处理中间件
const handleError = (error, res) => {
  res.status(400).json({
    status: 'error',
    message: error.message
  });
};

// 通用响应函数
const handleResponse = (data, res, status = 200) => {
  res.status(status).json({
    status: 'success',
    data
  });
};









function handleResponse2(data, res, statusCode) {
  res.status(statusCode).json(data || { status: 'success' });
}

function handleError2(error, res) {
  if (error.status === 'fail') {
    res.status(400).json({
      status: error.status,
      errorCode: error.errorCode,
      message: error.message
    });
  } else {
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      details: error.message
    });
  }
}










exports.deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.user.userId; // 假设从JWT Token中获取用户ID

    await deleteImageById(imageId, userId);
    handleResponse2(null, res, 204);
  } catch (error) {
    handleError2(error, res);
  }
};


exports.getCategories = async (req, res) => {
  try {
    const lang = req.query.lang || 'zh';
    const result = await getCategoriesServices(lang);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};