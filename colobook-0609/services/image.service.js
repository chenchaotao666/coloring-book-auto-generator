const { findImagesByUserId, findImageByTaskId,  findImageById, updateImageByIdm, deleteImage} = require('../models/image.model');
const {updateUseravailableScore} = require('../models/user.model');
const {   findImagesByQuery,
          countImagesByQuery,
          findImagesByCategoryId,
          countImagesByCategoryId,
          findImagesByTags,
          countImagesByTags,
          findImagesByRatio,
          countImagesByRatio,
          findImagesByType,
          countImagesByType,
          countImagesByUserId,
          findImagesByIsPublic,
          countImagesByIsPublic,
          updateImageTaskIdByid,
          findImages,
          createImageExt,
          getCategoriesm
        } = require('../models/image.model');




const axios = require('axios');
const envConfig = require('../config/env.config');
const { v4: uuidv4 } = require('uuid');
const { ossClient } = require('../config/oss.config');
const path = require('path');
const fs = require('fs');
const KIEAI_API_URL = envConfig.KIEAI_API_URL;
const KIEAI_AUTH_TOKEN = envConfig.KIEAI_AUTH_TOKEN;
const sharp = require('sharp');

//用于写错误日志----0618
const logFilePath = path.join(__dirname, 'error_logs.txt');
//end



async function handleImageTaskId_Update(id, taskId) {
  await updateImageTaskIdByid(id, taskId);
}





/* **接口地址:** `GET /api/images`会调用handleGetImages
**接口描述:** 查询图片，支持多种筛选条件和分页
**查询参数:**

| 参数        | 类型    | 必填 | 说明                   | 默认值                 |
| ----------- | ------- | ---- | ---------------------- | ---------------------- |
| imageId     | string  | 否   | 图片ID（查询单张图片） | -                      |
| query       | string  | 否   | 搜索关键词             | -                      |
| categoryId    | string  | 否   | 分类筛选               | 大类，如漫威宇宙-         |
| tags        | string  | 否   | 标签筛选（逗号分隔）   | -  小类，钢铁侠，蜘蛛侠       |
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
```

**响应示例:**
```json
{
  "status": "success",
  "data": {
    images: [{
      "id": "cat",
      "name": "cat",
      "defaultUrl": "/images-mock/cat-default.png",
      "colorUrl": "/images-mock/cat-color.png",
      "title": "小猫",
      "description": "可爱的小猫咪",
      "tags": ["Animal", "Cat", "Cute", "Pet"],
      "type": "text2image",
      "ratio": "1:1",
      "isPublic": true,
      "createdAt": "2024-01-15T11:15:00.000Z",
      "prompt": "可爱的小猫咪涂色页，圆润的线条设计，大眼睛和小鼻子",
      "userId": "system",
      "categoryId": "id-animals",
      "size": "100,500",
      "additionalInfo": "{xxx: xxx}"
    }],
    "total": 156
  }
}

 */



/* async function handleGetImages(req) {
  const criteria = {
    imageId: req.query.imageId || null,
    query: req.query.query || null,
    categoryId: req.query.categoryId || null,
    tags: req.query.tags || null,
    ratio: req.query.ratio || null,
    type: req.query.type || null,
    userId: req.query.userId || null,
    isPublic: req.query.isPublic === 'true' || null,
    currentPage: parseInt(req.query.currentPage, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20
  };

  let images = [];
  let total = 0;

  if (criteria.imageId) {
    // 查询单张图片
    images = await findImageById(criteria.imageId);
    total = images.length;
  } else if (criteria.query) {
    // 搜索图片
    images = await findImagesByQuery(criteria);
    total = await countImagesByQuery(criteria);
  } else if (criteria.categoryId) {
    // 按分类筛选
    images = await findImagesByCategoryId(criteria);
    total = await countImagesByCategoryId(criteria);
  } else if (criteria.tags) {
    // 按标签筛选
    images = await findImagesByTags(criteria);
    total = await countImagesByTags(criteria);
  } else if (criteria.ratio) {
    // 按比例筛选
    images = await findImagesByRatio(criteria);
    total = await countImagesByRatio(criteria);
  } else if (criteria.type) {
    // 按类型筛选
    images = await findImagesByType(criteria);
    total = await countImagesByType(criteria);
  } else if (criteria.userId) {
    // 按用户ID筛选
    images = await findImagesByUserId(criteria);
    total = await countImagesByUserId(criteria);
  } else if (criteria.isPublic !== undefined) {
    // 按是否公开筛选
    images = await findImagesByIsPublic(criteria);
    total = await countImagesByIsPublic(criteria);
  } else {
    // 默认查询所有图片
    images = await findImages(criteria);
    total = await countImages(criteria);
  }

  return { images, total };
}
 */
async function handleGetImages(req) {
  console.log('handleGetImages function started');
  console.log('Received request query:', req.query);

  const criteria = {
    imageId: req.query.imageId || null,
    query: req.query.query || null,
    categoryId: req.query.categoryId || null,
    tags: req.query.tags || null,
    ratio: req.query.ratio || null,
    type: req.query.type || null,
    userId: req.query.userId || null,
    isPublic: req.query.isPublic === 'true' || null,
    currentPage: parseInt(req.query.currentPage, 10) || 1,
    pageSize: parseInt(req.query.pageSize, 10) || 20
  };

  console.log('Constructed criteria:', criteria);

  let images = [];
  let total = 0;

  if (criteria.imageId) {
    console.log(`Searching for image by ID: ${criteria.imageId}`);
    images = await findImageById(criteria.imageId);
    console.log(`Image found by ID:`, images);
    total = images.length;
  } else if (criteria.query) {
    console.log(`Searching images by query: ${criteria.query}`);
    images = await findImagesByQuery(criteria);
    console.log('Images found by query:', images.length);
    total = await countImagesByQuery(criteria);
  } else if (criteria.categoryId) {
    console.log(`Searching images by category ID: ${criteria.categoryId}`);
    images = await findImagesByCategoryId(criteria);
    console.log('Images found by category ID:', images.length);
    total = await countImagesByCategoryId(criteria);
  } else if (criteria.tags) {
    console.log(`Searching images by tags: ${criteria.tags}`);
    images = await findImagesByTags(criteria);
    console.log('Images found by tags:', images.length);
    total = await countImagesByTags(criteria);
  } else if (criteria.ratio) {
    console.log(`Searching images by ratio: ${criteria.ratio}`);
    images = await findImagesByRatio(criteria);
    console.log('Images found by ratio:', images.length);
    total = await countImagesByRatio(criteria);
  } else if (criteria.type) {
    console.log(`Searching images by type: ${criteria.type}`);
    images = await findImagesByType(criteria);
    console.log('Images found by type:', images.length);
    total = await countImagesByType(criteria);
  } else if (criteria.userId) {
    console.log(`Searching images by user ID: ${criteria.userId}`);
    images = await findImagesByUserId(criteria);
    console.log('Images found by user ID:', images.length);
    total = await countImagesByUserId(criteria);
  } else if (criteria.isPublic !== undefined) {
    console.log(`Searching images by isPublic: ${criteria.isPublic}`);
    images = await findImagesByIsPublic(criteria);
    console.log('Images found by isPublic:', images.length);
    total = await countImagesByIsPublic(criteria);
  } else {
    console.log('Searching all images');
    images = await findImages(criteria);
    console.log('Total images found:', images.length);
    total = await countImages(criteria);
  }

  console.log('Final images data:', images);
  console.log('Total count:', total);
  console.log('handleGetImages function completed');

  return { images, total };
}


//是不是应该把所有的事情提前考虑呢？算了，先做好一件事吧，也就是先只考虑一张图片
/* async function uploadImages(req) {
   try {

    const { user } = req; // 从 req 中获取用户信息
    const files = req.files; // 从 req 中获取上传的文件数组
    const prompt = req.body.prompt; // 从请求体中获取 prompt
// 从请求体中获取其他字段
    const tags = req.body.tags || []; // 默认为空数组
    const type = req.body.type || 'default_type'; // 默认值为 'default_type'
    const categoryId = req.body.categoryId || null; // 默认为 null
    const isPublic_new = req.body.isPublic !== undefined ? req.body.isPublic : true; // 默认为 true
    const colorUrl = req.body.colorUrl || null; // 默认为 null

    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }
    // 假设只处理第一个文件
    const file = files[0];
    console.log('Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });




    // 使用 UUID 重命名图片
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    const newFileName = `${uuid}${ext}`;

    // 构造 OSS 存储路径
    const ossPath = `colorbook/user_images/${newFileName}`;

    // 读取文件内容
      const fileBuffer = file.buffer; // 使用文件的 buffer，而不是读取文件路径
    //const fileBuffer = fs.readFileSync(file.path);

    // 使用 sharp 获取图片分辨率
    const metadata = await sharp(file.path).metadata();
    const { width, height } = metadata;
    // 上传文件到 OSS
    const result = await ossClient.put(ossPath, fileBuffer, {
      mime: file.mimetype,
      headers: {
        'x-oss-object-acl': 'public-read'
      }
    });

    // 获取图片的 URL
    const imageUrl = result.url;

    // 构造图片信息
    const image = {
      user_id: user._id,
      image_name: file.originalname,
      defaultUrl: imageUrl,
      colorUrl: colorUrl, // 使用从请求体中获取的 colorUrl
      title: `Generated Image ${uuid}`,
      description: `Generated image for prompt: ${prompt}`,
      type: type, // 使用从请求体中获取的 type
      ratio: `${width}:${height}`,  // 使用图片的实际宽高比
      isPublic: isPublic_new,
      prompt: prompt,
      categoryId: categoryId, // 使用从请求体中获取的 categoryId
      size: `${width},${height}`, // 存储图片的宽高,  
      additionalInfo: JSON.stringify({
        size: file.size,
        mimetype: file.mimetype,
        originalname: file.originalname
      })
    };

    // 调用服务层函数存储图片信息
   
    const newImage = await createImageExt(image, tags);

 
    return newImage;

  } catch (error) {
    throw error;
  }
}

 */

async function uploadImages(req) {
  try {
    console.log('UploadImages function started');
    const { user } = req; // 从 req 中获取用户信息
    const files = req.files; // 从 req 中获取上传的文件数组
    const prompt = req.body.prompt; // 从请求体中获取 prompt

    // 从请求体中获取其他字段
    const tags = req.body.tags || []; // 默认为空数组
    const type = req.body.type || 'default_type'; // 默认值为 'default_type'
    const categoryId = req.body.categoryId || null; // 默认为 null
    const isPublic_new = req.body.isPublic !== undefined ? (req.body.isPublic ? 1 : 0) : 1;// 默认为 true
    const colorUrl = req.body.colorUrl || null; // 默认为 null

    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    // 假设只处理第一个文件
    const file = files[0];
    console.log('Processing file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // 检查文件类型是否受支持
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // 使用 Sharp 获取图片分辨率
    let metadata;
    try {
      console.log('Using Sharp to retrieve image metadata');
      metadata = await sharp(file.buffer).metadata();
      console.log('Image metadata retrieved successfully');
    } catch (error) {
      console.error('Error retrieving image metadata:', error);
      throw new Error('Invalid image file');
    }

    const { width, height } = metadata;

    // 使用 UUID 重命名图片
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    const newFileName = `${uuid}${ext}`;

    // 构造 OSS 存储路径
    const ossPath = `colorbook/user_images/${newFileName}`;

    // 上传文件到 OSS
    try {
      console.log('Uploading file to OSS');
      const result = await ossClient.put(ossPath, file.buffer, {
        mime: file.mimetype,
        headers: {
          'x-oss-object-acl': 'public-read'
        }
      });
      console.log('File uploaded to OSS successfully');
      const imageUrl = result.url;

      // 构造图片信息
      const image = {
        user_id: user._id,
        image_name: file.originalname,
        defaultUrl: imageUrl,
        colorUrl: colorUrl, // 使用从请求体中获取的 colorUrl
        title: `Generated Image ${uuid}`,
        description: `Generated image for prompt: ${prompt}`,
        type: type, // 使用从请求体中获取的 type
        ratio: `${width}:${height}`,  // 使用图片的实际宽高比
        isPublic: isPublic_new,
        prompt: prompt,
        categoryId: categoryId, // 使用从请求体中获取的 categoryId
        size: `${width},${height}`, // 存储图片的宽高
        additionalInfo: JSON.stringify({
          size: file.size,
          mimetype: file.mimetype,
          originalname: file.originalname
        })
      };

      // 调用服务层函数存储图片信息
      console.log('Creating new image entry in database');
      const newImage = await createImageExt(image, tags);
      console.log('New image entry created successfully');

      return newImage;
    } catch (error) {
      console.error('Error uploading file to OSS:', error);
      throw new Error('File upload to OSS failed');
    }
  } catch (error) {
    console.error('Error in uploadImages function:', error);
    throw error;
  }
}

async function getImagesByUserId(userId) {
  return await findImagesByUserId(userId);
}

async function getImageById(imageId) {
  return await findImageById(imageId);
}

async function updateImageById(imageId, image) {
  await updateImageByIdm(imageId, image);
  return await findImageById(imageId);
}

async function deleteImageById(imageId, userId) {
  try {
    // 查询图片是否存在
    const image = await findImageById(imageId);
    if (!image) {
      throw { status: 'fail', errorCode: '2001', message: '指定的图片不存在或已被删除' };
    }

    // 检查当前用户是否是图片的创建者
    if (image.creator_id !== userId) {
      throw { status: 'fail', errorCode: '2004', message: '只能删除自己创建的图片' };
    }

    // 删除图片
    await deleteImage(imageId);
  } catch (error) {
    throw error; // 向外抛出错误，由上层处理
  }
}

//这里也需要对数据库进行处理，处理后的图片也要进数据库才对，放在哪儿好呢？

async function img2imggenerateImages(data) {
  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${envConfig.KIEAI_API_URL}/gpt4o-image/generate`,
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json', 
      'Authorization': `Bearer ${envConfig.KIEAI_AUTH_TOKEN}`
    },
    data: JSON.stringify(data)
  };

  try {
    console.log('imggenerate config:', config);
    const response = await axios.request(config);
    console.log('imggenerate response:', response.data);

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
    // 捕获并处理错误
    console.error('imggenerate error:', error);
    throw error; // 重新抛出错误以便调用者处理
  }
}

/*       // 提取 paramJson 并传递给 handleTaskCompletion
      const paramJson = response.data.data.paramJson;

      const taskData = {
        resultUrls: response.data.data.response.resultUrls.map(url => url.match(/"(.*?)"/)[1]), // 提取 URL
        uploadDir: 'colorbook/user_images',
        taskId: response.data.data.taskId,
        paramJson: paramJson // 添加 paramJson 到 taskData
      }; */




async function handleTaskCompletion(taskData) {
  const { resultUrls, uploadDir, taskId } = taskData;
  const uploadResults = [];

  // 根据 taskId 查找数据库中的图片记录
  const existingImage = await findImageByTaskId(taskId);



  for (const url of resultUrls) {
    try {

      // 提取 URL 中的文件名，UUID 重命名图片
      const uuid = uuidv4();
      const basename = path.basename(new URL(url).pathname);
      const ext = path.extname(basename);
      const newFileName = `${uuid}${ext}`;
      const ossPath = `${uploadDir}/${newFileName}`;

      /* 我目前通过下面的代码将文件从一个网页上 url ，拷贝到阿里云的桶里，这种方式是否可行？
      哪里可以改进，我对这个有疑问，downloadResponse 能直接传递吗？ 文件会不会再本地缓存一下？
      有没有把数据从一个连接，保存到 网盘上的直接传递的技术？ */

      // 从kie.ai 网站上下载图片，是临时文件吗？下载到啥地方，我现在还不知道，先存到本地，然后上传到 oss
      const downloadResponse = await axios({
        method: 'get',
        url,
        responseType: 'stream',
        timeout: 10000 // 设置超时时间，例如 10 秒
      });

      // 上传到 OSS
      await ossClient.put(ossPath, downloadResponse.data, {
        mime: downloadResponse.headers['content-type'],
        headers: {
          'x-oss-object-acl': 'public-read'
        }
      });

      // 保存 OSS URL
      const ossUrl = await ossClient.signatureUrl(ossPath);
      uploadResults.push({ originalUrl: url, ossUrl });

      // 构造图片信息，这里的疑问，如果是有原图没问题，没有原图呢？如何把比例传递过来？
     // 如果 paramJson 存在，解析并打印
      if (paramJson) {
        try {
          const parsedParam = JSON.parse(paramJson);
          console.log('Parsed paramJson:', parsedParam);
        } catch (error) {
          console.error('Failed to parse paramJson:', error);
        }
      }


      const image = {
        id: newFileName,
        name: `generated_${uuid}_${ext}`,
        defaultUrl: ossUrl,
        colorUrl: existingImage ? existingImage.colorUrl : ossUrl, // 如果找到记录，使用记录中的 colorUrl
        title: `Generated Image ${uuid}`,
        description: `Generated image for task ${taskId}`,
        type: "generated",
        ratio: parsedParam.size || "1:1",// 如果找到记录，使用记录中的 ratio
        isPublic: parsedParam.isPublic,
        createdAt: new Date().toISOString(),
        prompt: parsedParam.prompt || " Generated image for task ${taskId}  ", // 如果找到记录，使用记录中的 prompt
        userId: existingImage ? existingImage.userId : "system", // 如果找到记录，使用记录中的 userId
        categoryId: "generated",
        size: existingImage ? existingImage.size : "512,512", // 如果找到记录，使用记录中的 size，这个有待商榷，到底生成多大的，也没写啊
        additionalInfo: {},
        crt_task_id: taskId
      };
      // 如果找到记录，就使用记录中的tags
      const image_new_tag = existingImage ? existingImage.tags : ["generated"]

      await  createImageExt(image, image_new_tag)

     // await saveImage(image);
    } catch (error) {
      console.error(`Failed to download or upload ${url}:`, error);
      uploadResults.push({ originalUrl: url, error: error.message });
    }
  }

  console.log('Images uploaded to OSS:', uploadResults);
  return uploadResults;
}

/////////////////////////////////////

/* 主要修改点：
日志记录功能：
使用 fs.appendFile 将错误信息写入到 error_logs.txt 文件中。
每个错误日志包含任务 ID、错误代码和错误消息。
错误处理：
根据不同的 HTTP 状态码进行分类处理，并打印相应的日志。
对于每个错误状态码，都生成一条详细的日志记录，包含任务 ID 和错误描述。
维护接口：
添加了一个 getErrorLogs 函数，用于读取错误日志文件并返回给前端。
该接口可以用于维护和调试，方便查看历史错误记录。
统一错误抛出：
在捕获错误后，生成日志并重新抛出错误，确保上层调用者能够接收到错误信息。
 */

// 写入日志文件
function writeLog(logMessage) {
  fs.appendFile(logFilePath, logMessage + '\n', (err) => {
    if (err) {
      console.error('Failed to write log:', err);
    }
  });
}

// 获取错误日志接口
async function getErrorLogs(req, res) {
  try {
    const logs = await fs.promises.readFile(logFilePath, 'utf8');
    res.status(200).json({
      status: 'success',
      logs: logs
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve error logs',
      details: error.message
    });
  }
}




//调用接口：  GET https://kieai.erweima.ai/api/v1/gpt4o-image/record-info
//状态说明 GENERATING: 生成中   SUCCESS: 生成成功  CREATE_TASK_FAILED: 创建任务失败 GENERATE_FAILED: 生成失败
//入参： taskId  string   4o图像生成任务的唯一标识符  Example: task12345
// Responses:
//	Enum Value	Description
//	200	成功 - 请求已成功处理
//	401	未授权 - 缺少身份验证凭据或凭据无效
//	402	积分不足 - 账户没有足够的积分执行此操作
//	404	未找到 - 请求的资源或端点不存在
//	422	参数错误 - 请求参数未通过验证检查
//	429	超出限制 - 已超过对此资源的请求限制
//	455	服务不可用 - 系统当前正在进行维护
//	500	服务器错误 - 在处理请求时发生意外错误
//	505	功能已禁用 - 请求的功能当前已禁用

/* 响应的例子：
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task12345",
    "paramJson": "{\"prompt\":\"A beautiful sunset over the mountains\",\"size\":\"1:1\",\"isEnhance\":false}",
    "completeTime": 1672574400000,
    "response": {
      "resultUrls": [
        "https://example.com/result/image1.png"
      ]
    },
    "successFlag": 1,
    "status": "SUCCESS",
    "errorCode": 400,
    "errorMessage": "",
    "createTime": 1672561200000,
    "progress": "1.00"
  }
}
 


msg
string
当 code != 200 时的错误信息

Example: success
data
object
taskId
string
4o图像生成任务的唯一标识符

Example: task12345
paramJson
string
调用参数

Example: {"prompt":"A beautiful sunset over the mountains","size":"1:1","isEnhance":false}
completeTime
int64
任务完成时间

Example: 1672574400000
response
object
最终结果

resultUrls
string[]
生成的图片URL列表

Example: ["https://example.com/result/image1.png"]
successFlag
int32
生成状态标志

Example: 1
status
string
生成状态文本类型，可选值：GENERATING-生成中，SUCCESS-成功，CREATE_TASK_FAILED-创建任务失败，GENERATE_FAILED-生成失败

Possible values: [GENERATING, SUCCESS, CREATE_TASK_FAILED, GENERATE_FAILED]

Example: SUCCESS
*/




async function getRecordInfo(taskId, userId) {
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


        // 先检查 errorCode，不行就直接弹出来
    if (response.data.errorCode) {
      switch (response.data.errorCode) {
        case 400:
          throw new Error('内容违规 - filesUrl参数中的图片内容违反了内容政策');
        case 451:
          throw new Error('下载失败 - 无法从提供的filesUrl下载图片');
        default:
          throw new Error(`未知错误 - 错误码: ${response.data.errorCode}`);
      }
    }


    // 根据不同的 HTTP 状态码进行处理
    switch (response.status) {
      case 200:
        console.log('getRecordInfo response (200 OK):', response.data);
        break;
      case 401:
        console.log('getRecordInfo response (401 Unauthorized):', response.data);
        const logMessage401 = `TaskId: ${taskId}, Error Code: 401, Message: 未授权 - 缺少身份验证凭据或凭据无效`;
        writeLog(logMessage401);
        throw new Error(logMessage401);
      case 402:
        console.log('getRecordInfo response (402 Payment Required):', response.data);
        const logMessage402 = `TaskId: ${taskId}, Error Code: 402, Message: 积分不足 - 账户没有足够的积分执行此操作`;
        writeLog(logMessage402);
        throw new Error(logMessage402);
      case 404:
        console.log('getRecordInfo response (404 Not Found):', response.data);
        const logMessage404 = `TaskId: ${taskId}, Error Code: 404, Message: 未找到 - 请求的资源或端点不存在`;
        writeLog(logMessage404);
        throw new Error(logMessage404);
      case 422:
        console.log('getRecordInfo response (422 Unprocessable Entity):', response.data);
        const logMessage422 = `TaskId: ${taskId}, Error Code: 422, Message: 参数错误 - 请求参数未通过验证检查`;
        writeLog(logMessage422);
        throw new Error(logMessage422);
      case 429:
        console.log('getRecordInfo response (429 Too Many Requests):', response.data);
        const logMessage429 = `TaskId: ${taskId}, Error Code: 429, Message: 超出限制 - 已超过对此资源的请求限制`;
        writeLog(logMessage429);
        throw new Error(logMessage429);
      case 455:
        console.log('getRecordInfo response (455 Retry With):', response.data);
        const logMessage455 = `TaskId: ${taskId}, Error Code: 455, Message: 服务不可用 - 系统当前正在进行维护`;
        writeLog(logMessage455);
        throw new Error(logMessage455);
      case 500:
        console.log('getRecordInfo response (500 Internal Server Error):', response.data);
        const logMessage500 = `TaskId: ${taskId}, Error Code: 500, Message: 服务器错误 - 在处理请求时发生意外错误`;
        writeLog(logMessage500);
        throw new Error(logMessage500);
      case 505:
        console.log('getRecordInfo response (505 HTTP Version Not Supported):', response.data);
        const logMessage505 = `TaskId: ${taskId}, Error Code: 505, Message: 功能已禁用 - 请求的功能当前已禁用`;
        writeLog(logMessage505);
        throw new Error(logMessage505);
      default:
        console.log(`getRecordInfo response (Unexpected Status Code ${response.status}):`, response.data);
        const logMessageDefault = `TaskId: ${taskId}, Error Code: ${response.status}, Message: 收到意外的状态码`;
        writeLog(logMessageDefault);
        throw new Error(logMessageDefault);
    }

    // 检查任务是否完成
    if (response.data.data.progress === '1.00' && response.data.data.status === 'SUCCESS') {
      console.log('Task completed. Downloading and uploading images to OSS...');

      // 提取 paramJson 并传递给 handleTaskCompletion
      const paramJson = response.data.data.paramJson;

      const taskData = {
        resultUrls: response.data.data.response.resultUrls.map(url => url.match(/"(.*?)"/)[1]), // 提取 URL
        uploadDir: 'colorbook/user_images',
        taskId: response.data.data.taskId,
        paramJson: paramJson // 添加 paramJson 到 taskData
      };
      // 调用 handleTaskCompletion 函数处理任务完成后的逻辑
      const uploadResults = await handleTaskCompletion(taskData);
      //开始扣分
      // 将上传结果附加到响应数据中
      response.data.uploadResults = uploadResults;

            // 扣减用户积分
      await updateUseravailableScore(userId, -20); // 扣减 20 分

    } else {
  // 打印其他状态
        console.log(`Task status: ${response.data.data.status}`);
        switch (response.data.data.status) {
          case 'GENERATING':
            console.log('Task is generating...');
            break;
          case 'CREATE_TASK_FAILED':
            console.log('Task creation failed.');
            break;
          case 'GENERATE_FAILED':
            console.log('Task generation failed.');
            break;
          default:
            console.log(`Unknown task status: ${response.data.data.status}`);
        }
      }

    // 如果状态是 CREATE_TASK_FAILED 或 GENERATE_FAILED，打印日志并正常返回
    if (response.data.data.status === 'CREATE_TASK_FAILED' || response.data.data.status === 'GENERATE_FAILED') {
      console.error(`Task failed with status: ${response.data.data.status}`);
      // 可以选择在这里记录日志或执行其他操作
    } 
    return response.data;

  } catch (error) {
    console.error(`Failed to get record info for taskId ${taskId}:`, error.message);
    const logMessageError = `TaskId: ${taskId}, Error: ${error.message}`;
    writeLog(logMessageError);
    throw error;
  }
}




//////////////////////////////////

async function getDownloadUrl(data) {
  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/download-url`,
    headers: { 
      'Content-Type': 'application/json', 
      'Accept': 'application/json', 
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    data: JSON.stringify(data)
  };
  console.log('getDownloadUrl config:', config);
  const response = await axios.request(config);
  return response.data;
}



async function getCategoriesServices(lang) {
  const { categories, tags } = await getCategoriesm(lang);

  // 将标签信息按分类分组
  const categoryMap = new Map();
  categories.forEach(category => {
    categoryMap.set(category.category_code, {
      id: category.category_code,
      name: category.category_alias,
      displayName: category.displayName,
      description: category.description,
      tagCounts: [],
      thumbnailUrl:category.thumbnailUrl   //这里的thumbnail 要给出来，先放在categories 数据库里，每个category预制一个吧
    });
  });

  tags.forEach(tag => {
    const categoryCode = tag.tag_code.split('-')[0]; // 假设 tag_code 包含分类前缀，如 id-animals-welcome
    const category = categoryMap.get(categoryCode);
    if (category) {
      category.tagCounts.push({
        tagname: tag.tag_alias,
        displayname: tag.displayname,
        count: tag.count
      });
    }
  });

  return {
    categories: Array.from(categoryMap.values()),
    total: categories.length
  };


}




module.exports = {
  uploadImages,
  getImagesByUserId,
  getImageById,
  updateImageById,
  deleteImageById,
  img2imggenerateImages,
  getRecordInfo,  
  getDownloadUrl,
  handleGetImages,
  handleImageTaskId_Update,
  getRecordInfo,
  getCategoriesServices,
  getErrorLogs // 导出错误日志接口
};
