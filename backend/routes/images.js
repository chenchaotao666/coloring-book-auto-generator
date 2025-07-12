const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const ImageModel = require('../models/imageModel')
const CategoryModel = require('../models/categoryModel')
const TagModel = require('../models/tagModel')
const ImageColoringService = require('../services/imageColoringService')
const { v4: uuidv4 } = require('uuid')

// 引入重构后的图片服务
const imageService = require('../services/imageColoringService')

// 配置multer用于文件上传
const storage = multer.memoryStorage() // 使用内存存储，直接处理Buffer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制文件大小为10MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'), false)
    }
  }
})

// 上色任务的图片处理缓存，防止重复上传
const coloringImageCache = new Map()
const taskImageCache = new Map() // 任务图片缓存

// 获取所有图片（支持分页和筛选）
router.get('/', async (req, res) => {
  try {
    console.log('req.query.............', req.query)
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    // 构建筛选条件
    const filters = {}
    if (req.query.category_id) filters.category_id = req.query.category_id
    if (req.query.type) filters.type = req.query.type
    if (req.query.isPublic !== undefined) filters.isPublic = req.query.isPublic === 'true'
    if (req.query.userId) filters.userId = req.query.userId
    if (req.query.search) filters.search = req.query.search

    const result = await ImageModel.getAll(page, limit, filters)

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('获取图片列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取图片列表失败',
      error: error.message
    })
  }
})

// 获取保存图片时可用的分类和标签选项
router.get('/save-options', async (req, res) => {
  try {
    // 并行获取分类和标签数据
    const [categories, tags] = await Promise.all([
      CategoryModel.getAll(),
      TagModel.getAll()
    ])

    res.json({
      success: true,
      message: '获取保存选项成功',
      data: {
        categories: categories.map(cat => ({
          id: cat.category_id,
          category_id: cat.category_id,
          name: cat.display_name,
          display_name: cat.display_name,
          description: cat.description,
          imageId: cat.image_id,
          hotness: cat.hotness
        })),
        tags: tags.map(tag => ({
          id: tag.tag_id,
          tag_id: tag.tag_id,
          name: tag.display_name,
          display_name: tag.display_name,
          description: tag.description
        }))
      }
    })

  } catch (error) {
    console.error('获取保存选项失败:', error)
    res.status(500).json({
      success: false,
      message: '获取保存选项失败',
      error: error.message
    })
  }
})

// 根据ID获取图片
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const image = await ImageModel.getById(id)

    if (!image) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    res.json({
      success: true,
      data: image
    })
  } catch (error) {
    console.error('获取图片详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取图片详情失败',
      error: error.message
    })
  }
})

// 从前端生成的内容批量保存图片到数据库
router.post('/save-generated', async (req, res) => {
  try {
    const { images } = req.body

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的图片数据数组'
      })
    }

    const savedImages = []
    const errors = []

    // 批量处理图片保存
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i]

      try {
        // 构建数据库图片数据
        const dbImageData = {
          name: imageData.name ?
            (typeof imageData.name === 'object' ? imageData.name : { zh: imageData.name }) :
            { zh: imageData.title || `图片${i + 1}` },
          title: imageData.title ?
            (typeof imageData.title === 'object' ? imageData.title : { zh: imageData.title }) :
            { zh: `生成的图片${i + 1}` },
          description: imageData.description ?
            (typeof imageData.description === 'object' ? imageData.description : { zh: imageData.description }) :
            { zh: '从前端生成的图片' },
          defaultUrl: imageData.imagePath || imageData.defaultUrl || null,
          colorUrl: imageData.colorUrl || null,
          coloringUrl: imageData.coloringUrl || null,
          type: imageData.type || 'text2image',
          ratio: imageData.imageRatio || imageData.ratio || '1:1',
          isPublic: imageData.isPublic !== undefined ? imageData.isPublic : true,
          hotness: imageData.hotness || 0,
          prompt: imageData.prompt ?
            (typeof imageData.prompt === 'object' ? imageData.prompt : { zh: imageData.prompt }) :
            { zh: '前端生成' },
          userId: imageData.userId || 'frontend_user',
          categoryId: imageData.categoryId || imageData.category_id || null,
          size: imageData.size || null,
          additionalInfo: typeof imageData.additionalInfo === 'object' ?
            imageData.additionalInfo :
            (imageData.additionalInfo || {}),
          tagIds: imageData.tagIds || []
        }

        const savedImage = await ImageModel.create(dbImageData)
        savedImages.push(savedImage)

      } catch (error) {
        console.error(`保存第${i + 1}张图片失败:`, error)
        errors.push({
          index: i,
          imageData: imageData.title || `图片${i + 1}`,
          error: error.message
        })
      }
    }

    // 返回结果
    const response = {
      success: true,
      message: `成功保存 ${savedImages.length}/${images.length} 张图片`,
      data: {
        savedImages,
        totalRequested: images.length,
        totalSaved: savedImages.length,
        totalFailed: errors.length
      }
    }

    if (errors.length > 0) {
      response.errors = errors
      response.message += `，${errors.length} 张失败`
    }

    res.status(201).json(response)

  } catch (error) {
    console.error('批量保存图片失败:', error)
    res.status(500).json({
      success: false,
      message: '批量保存图片失败',
      error: error.message
    })
  }
})

// 从前端生成的内容中选择性保存单张图片
router.post('/save-selected', async (req, res) => {
  try {
    const imageData = req.body

    // 验证必要字段
    if (!imageData.title && !imageData.name) {
      return res.status(400).json({
        success: false,
        message: '请提供图片标题或名称'
      })
    }

    // 构建数据库图片数据
    const dbImageData = {
      name: imageData.name ?
        (typeof imageData.name === 'object' ? imageData.name : { zh: imageData.name }) :
        { zh: imageData.title || '选中的图片' },
      title: imageData.title ?
        (typeof imageData.title === 'object' ? imageData.title : { zh: imageData.title }) :
        { zh: '选中的图片' },
      description: imageData.description ?
        (typeof imageData.description === 'object' ? imageData.description : { zh: imageData.description }) :
        { zh: '从前端选中保存的图片' },
      defaultUrl: imageData.imagePath || imageData.defaultUrl || null,
      colorUrl: imageData.colorUrl || null,
      coloringUrl: imageData.coloringUrl || null,
      type: imageData.type || 'text2image',
      ratio: imageData.imageRatio || imageData.ratio || '1:1',
      isPublic: imageData.isPublic !== undefined ? imageData.isPublic : true,
      hotness: imageData.hotness || 0,
      prompt: imageData.prompt ?
        (typeof imageData.prompt === 'object' ? imageData.prompt : { zh: imageData.prompt }) :
        { zh: '前端选中' },
      userId: imageData.userId || 'frontend_user',
      categoryId: imageData.categoryId || imageData.category_id || null,
      size: imageData.size || null,
      additionalInfo: typeof imageData.additionalInfo === 'object' ?
        imageData.additionalInfo :
        (imageData.additionalInfo || {}),
      tagIds: imageData.tagIds || []
    }

    const savedImage = await ImageModel.create(dbImageData)

    res.status(201).json({
      success: true,
      message: '图片保存成功',
      data: savedImage
    })

  } catch (error) {
    console.error('保存选中图片失败:', error)
    res.status(500).json({
      success: false,
      message: '保存选中图片失败',
      error: error.message
    })
  }
})

// 创建新图片
router.post('/', async (req, res) => {
  try {
    const {
      name, defaultUrl, colorUrl, coloringUrl, title, description,
      type, ratio, isPublic, isOnline, hotness, prompt, userId, category_id, size, additionalInfo, tagIds
    } = req.body

    console.log('🔍 POST /api/images - 接收到的数据:', {
      isPublic,
      isOnline,
      title: typeof title === 'object' ? Object.keys(title) : title
    })

    // 验证必填字段
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: '标题和类型为必填字段'
      })
    }

    const imageData = {
      name: name || {},
      defaultUrl: defaultUrl || null,
      colorUrl: colorUrl || null,
      coloringUrl: coloringUrl || null,
      title,
      description: description || {},
      type,
      ratio: ratio || '1:1',
      isPublic: isPublic !== undefined ? isPublic : true,
      isOnline: isOnline !== undefined ? isOnline : true, // 默认上线
      hotness: hotness || 0,
      prompt: prompt || {},
      userId: userId || null,
      categoryId: category_id || null,
      size: size || null,
      additionalInfo: additionalInfo || {},
      tagIds: tagIds || []
    }

    console.log('🔍 POST /api/images - 处理后的数据:', {
      isPublic: imageData.isPublic,
      isOnline: imageData.isOnline
    })

    const newImage = await ImageModel.create(imageData)

    res.status(201).json({
      success: true,
      message: '图片创建成功',
      data: newImage
    })
  } catch (error) {
    console.error('创建图片失败:', error)
    res.status(500).json({
      success: false,
      message: '创建图片失败',
      error: error.message
    })
  }
})

// 更新图片
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const {
      name, defaultUrl, colorUrl, coloringUrl, title, description,
      type, ratio, isPublic, isOnline, hotness, prompt, userId, categoryId, size, additionalInfo, tagIds
    } = req.body

    console.log('🔍 PUT /api/images/:id - 接收到的数据:', {
      id,
      isPublic,
      isOnline,
      title: typeof title === 'object' ? Object.keys(title) : title
    })

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    // 验证必填字段
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: '标题和类型为必填字段'
      })
    }

    const imageData = {
      name: name ?
        (typeof name === 'object' ? name : { zh: name }) :
        {},
      defaultUrl: defaultUrl !== undefined ? defaultUrl : existingImage.defaultUrl,
      colorUrl: colorUrl !== undefined ? colorUrl : existingImage.colorUrl,
      coloringUrl: coloringUrl !== undefined ? coloringUrl : existingImage.coloringUrl,
      title: title ?
        (typeof title === 'object' ? title : { zh: title }) :
        existingImage.title,
      description: description ?
        (typeof description === 'object' ? description : { zh: description }) :
        (existingImage.description || {}),
      type,
      ratio: ratio || '1:1',
      isPublic: isPublic !== undefined ? isPublic : true,
      isOnline: isOnline !== undefined ? isOnline : (existingImage.isOnline !== undefined ? existingImage.isOnline : true), // 保持现有值或默认上线
      hotness: hotness !== undefined ? hotness : (existingImage.hotness || 0),
      prompt: prompt ?
        (typeof prompt === 'object' ? prompt : { zh: prompt }) :
        (existingImage.prompt || {}),
      userId: userId || existingImage.userId,
      categoryId: categoryId !== undefined ? categoryId : existingImage.categoryId,
      size: size !== undefined ? size : existingImage.size,
      additionalInfo: typeof additionalInfo === 'object' ?
        additionalInfo :
        (additionalInfo !== undefined ? additionalInfo : existingImage.additionalInfo),
      tagIds: tagIds !== undefined ? tagIds : []
    }

    console.log(`🔧 PUT /api/images/${id} - 更新数据:`, {
      id,
      isPublic: imageData.isPublic,
      isOnline: imageData.isOnline,
      coloringUrl: coloringUrl,
      coloringUrlType: typeof coloringUrl,
      willUpdate: coloringUrl !== undefined
    })

    const updatedImage = await ImageModel.update(id, imageData)

    res.json({
      success: true,
      message: '图片更新成功',
      data: updatedImage
    })
  } catch (error) {
    console.error('更新图片失败:', error)
    res.status(500).json({
      success: false,
      message: '更新图片失败',
      error: error.message
    })
  }
})

// 删除图片
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    const deleted = await ImageModel.delete(id)

    if (deleted) {
      res.json({
        success: true,
        message: '图片删除成功'
      })
    } else {
      res.status(400).json({
        success: false,
        message: '删除图片失败'
      })
    }
  } catch (error) {
    console.error('删除图片失败:', error)
    res.status(500).json({
      success: false,
      message: '删除图片失败',
      error: error.message
    })
  }
})

// 更新图片分类
router.patch('/:id/category', async (req, res) => {
  try {
    const { id } = req.params
    const { categoryId } = req.body

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    const updatedImage = await ImageModel.updateCategory(id, categoryId)

    res.json({
      success: true,
      message: '图片分类更新成功',
      data: updatedImage
    })
  } catch (error) {
    console.error('更新图片分类失败:', error)
    res.status(500).json({
      success: false,
      message: '更新图片分类失败',
      error: error.message
    })
  }
})

// 更新图片标签
router.patch('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params
    const { tagIds } = req.body

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({
        success: false,
        message: 'tagIds必须是数组'
      })
    }

    await ImageModel.updateImageTags(id, tagIds)
    const updatedImage = await ImageModel.getById(id)

    res.json({
      success: true,
      message: '图片标签更新成功',
      data: updatedImage
    })
  } catch (error) {
    console.error('更新图片标签失败:', error)
    res.status(500).json({
      success: false,
      message: '更新图片标签失败',
      error: error.message
    })
  }
})

// 根据分类获取图片
router.get('/category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await ImageModel.getByCategory(categoryId, page, limit)

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('根据分类获取图片失败:', error)
    res.status(500).json({
      success: false,
      message: '根据分类获取图片失败',
      error: error.message
    })
  }
})

// 根据标签获取图片
router.get('/tag/:tagId', async (req, res) => {
  try {
    const { tagId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await ImageModel.getByTag(tagId, page, limit)

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    })
  } catch (error) {
    console.error('根据标签获取图片失败:', error)
    res.status(500).json({
      success: false,
      message: '根据标签获取图片失败',
      error: error.message
    })
  }
})

// 获取图片的标签
router.get('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    const tags = await ImageModel.getImageTags(id)

    res.json({
      success: true,
      data: tags
    })
  } catch (error) {
    console.error('获取图片标签失败:', error)
    res.status(500).json({
      success: false,
      message: '获取图片标签失败',
      error: error.message
    })
  }
})

/**
 * =================================
 * 图片生成相关路由
 * =================================
 */

// 文生图API
router.post('/text-to-image', async (req, res) => {
  try {
    console.log('🔍 收到文生图请求 - req.body:', JSON.stringify(req.body, null, 2));

    const { aiPrompt, text2imagePrompt, apiType = 'gpt4o', model, imageRatio = '1:1', imageFormat = 'png' } = req.body;

    console.log('🔍 解构后的参数:', {
      aiPrompt: aiPrompt,
      text2imagePrompt: text2imagePrompt,
      apiType: apiType,
      model: model,
      imageRatio: imageRatio,
      imageFormat: imageFormat
    });

    if (!aiPrompt) {
      console.log('❌ aiPrompt参数缺失!');
      return res.status(400).json({
        success: false,
        message: 'aiPrompt参数是必需的'
      });
    }

    // 注意：现在服务层可以处理所有比例，通过在prompt中添加landscape描述来支持不标准的比例

    console.log('✅ 收到文生图请求:', { aiPrompt, text2imagePrompt, apiType, model, imageRatio });

    const result = await imageService.generateTextToImage({
      aiPrompt,
      text2imagePrompt,
      apiType,
      model,
      imageRatio,
      imageFormat
    });

    res.json({
      success: true,
      data: result,
      message: '文生图任务创建成功'
    });

  } catch (error) {
    console.error('文生图API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '文生图任务创建失败'
    });
  }
});

// 图生图API - 支持文件上传
router.post('/image-to-image', upload.single('image'), async (req, res) => {
  try {
    console.log('收到图生图请求，开始处理...');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? { originalname: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype } : 'null');

    const { aiPrompt, image2imagePrompt, apiType = 'gpt4o', model, imageRatio = '1:1', imageFormat = 'png' } = req.body;

    let imageUrl = req.body.imageUrl; // 支持直接传URL

    // 如果上传了文件，先处理文件上传到公网存储
    if (req.file) {
      console.log('收到文件上传:', req.file.originalname, req.file.size);

      // 生成唯一文件名
      const timestamp = Date.now();
      const randomId = uuidv4().split('-')[0];
      const ext = path.extname(req.file.originalname) || '.png';
      const filename = `image-to-image_${timestamp}_${randomId}${ext}`;

      console.log('准备上传文件到公网存储，文件名:', filename);

      // 上传文件到公网存储（用户上传的彩色图片）
      try {
        const { uploadFileAndGetUrl, testImageDownload } = require('../utils/storageUtil');
        const storagePath = `chenchaotao/color/${filename}`;
        console.log('开始上传文件到存储，路径:', storagePath);
        imageUrl = await uploadFileAndGetUrl(req.file, storagePath);
        console.log('文件上传完成:', imageUrl);
      } catch (uploadError) {
        console.error('文件上传失败:', uploadError);
        return res.status(500).json({
          success: false,
          message: '文件上传失败: ' + uploadError.message,
          debug: uploadError.stack
        });
      }
    }

    console.log('参数验证 - imageUrl:', imageUrl);
    console.log('参数验证 - aiPrompt:', aiPrompt);
    console.log('参数验证 - apiType:', apiType);
    console.log('参数验证 - model:', model);
    console.log('参数验证 - imageRatio:', imageRatio);
    console.log('参数验证 - imageFormat:', imageFormat);

    if (!imageUrl || !aiPrompt) {
      const errorMsg = `参数验证失败 - imageUrl: ${imageUrl}, aiPrompt: ${aiPrompt}`;
      console.error(errorMsg);
      return res.status(400).json({
        success: false,
        message: '需要提供图片文件或imageUrl，以及aiPrompt参数',
        debug: errorMsg
      });
    }

    // 注意：现在服务层可以处理所有比例，通过在prompt中添加landscape描述来支持不标准的比例

    console.log('收到图生图请求:', { imageUrl, aiPrompt, image2imagePrompt, apiType, model, imageRatio });

    const result = await imageService.generateImageToImage({
      imageUrl,
      aiPrompt,
      image2imagePrompt,
      apiType,
      model,
      imageRatio,
      imageFormat
    });

    // 如果用户上传了文件，在返回结果中包含彩色图片URL
    const responseData = {
      ...result,
      uploadedColorImageUrl: req.file ? imageUrl : null // 用户上传的彩色图片URL
    };

    res.json({
      success: true,
      data: responseData,
      message: '图生图任务创建成功'
    });

  } catch (error) {
    console.error('图生图API错误:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || '图生图任务创建失败',
      debug: error.stack
    });
  }
});

// 图片上色API
router.post('/color-generate', async (req, res) => {
  try {
    const { imageId, imageUrl, prompt, coloringPrompt, apiType = 'gpt4o', model, options } = req.body;

    // 从options中提取apiType、model和imageFormat（向后兼容）
    const finalApiType = options?.apiType || apiType;
    const finalModel = options?.model || model;
    const finalImageFormat = options?.imageFormat || 'png'; // 添加imageFormat支持

    // 支持两种方式：直接提供imageUrl或通过imageId从数据库获取
    let actualImageUrl = imageUrl;

    if (!actualImageUrl && imageId) {
      // 通过imageId从数据库获取图片信息
      const image = await ImageModel.getById(imageId);
      if (!image) {
        return res.status(404).json({
          success: false,
          message: `图片ID ${imageId} 不存在`
        });
      }
      actualImageUrl = image.defaultUrl;
    }

    if (!actualImageUrl || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl(或imageId)和prompt参数都是必需的'
      });
    }

    console.log('收到图片上色请求:', {
      imageId,
      imageUrl: actualImageUrl,
      prompt,
      coloringPrompt,
      apiType: finalApiType,
      model: finalModel,
      imageFormat: finalImageFormat // 添加日志输出
    });

    const result = await imageService.generateColoredImage({
      imageUrl: actualImageUrl,
      prompt,
      coloringPrompt,
      apiType: finalApiType,
      model: finalModel,
      imageRatio: options?.ratio || '1:1',
      imageFormat: finalImageFormat // 添加imageFormat参数
    });

    res.json({
      success: true,
      data: {
        coloringResult: result  // 包装在coloringResult对象中，匹配前端期望
      },
      message: '图片上色任务创建成功'
    });

  } catch (error) {
    console.error('图片上色API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '图片上色任务创建失败'
    });
  }
});

// 查询任务状态API（增强版 - 自动下载和保存生成的图片）
router.get('/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { apiType = 'gpt4o', taskType = 'unknown' } = req.query;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'taskId参数是必需的'
      });
    }

    console.log('查询任务状态:', { taskId, apiType, taskType });

    const status = await imageService.checkTaskStatus(taskId, apiType);

    // 如果任务完成且有图片URL，自动下载并上传到指定目录
    let processedImageUrl = status.imageUrl;
    if (status.status === 'completed' && status.imageUrl) {
      // // 如果是flux-kontext类型，需要调用download-url接口获取新的下载链接
      // if (apiType === 'flux-kontext') {
      //   try {
      //     console.log('🔄 Flux-Kontext任务完成，正在获取新的下载链接...');

      //     // 调用flux/kontext/download-url接口
      //     const { callFluxKontextAPI } = require('../services/imageColoringService');
      //     const downloadData = await callFluxKontextAPI({
      //       taskId: taskId,
      //       url: status.imageUrl
      //     }, 'download-url');

      //     if (downloadData && downloadData.url) {
      //       status.imageUrl = downloadData.url;
      //       processedImageUrl = downloadData.url;
      //       console.log('✅ 获取到新的下载链接:', finalImageUrl);
      //     } else {
      //       console.warn('⚠️  获取新下载链接失败，使用原始URL');
      //     }
      //   } catch (downloadError) {
      //     console.error('❌ 获取Flux-Kontext下载链接失败:', downloadError);
      //     console.warn('⚠️  将使用原始URL继续处理');
      //   }
      // }

      // 检查缓存，避免重复处理同一张图片
      const cacheKey = `${taskId}-${status.imageUrl}`;

      if (taskImageCache.has(cacheKey)) {
        console.log('📋 从缓存获取处理后的图片URL:', taskImageCache.get(cacheKey));
        processedImageUrl = taskImageCache.get(cacheKey);
      } else {
        try {
          console.log('📥 任务完成，正在下载图片并上传到分类存储:', status.imageUrl);

          // 根据任务类型确定存储分类和文件名前缀
          let imageType, filenamePrefix;
          switch (taskType) {
            case 'text-to-image':
              imageType = 'TEXT_TO_IMAGE';  // 保存到 sketch/ 目录
              filenamePrefix = 'text-to-image';
              break;
            case 'image-to-image':
              imageType = 'TEXT_TO_IMAGE';  // 图生图生成的黑白线稿也保存到 sketch/ 目录
              filenamePrefix = 'image-to-image';
              break;
            case 'image-coloring':
              imageType = 'IMAGE_COLORING'; // 保存到 coloring/ 目录
              filenamePrefix = 'image-coloring';
              break;
            default:
              imageType = 'TEXT_TO_IMAGE';
              filenamePrefix = 'generated';
          }

          // 生成唯一文件名
          const { v4: uuidv4 } = require('uuid');
          const filename = `${filenamePrefix}_${Date.now()}_${uuidv4().split('-')[0]}.png`;

          // 使用分类存储功能上传图片
          const { downloadAndUploadToCategory } = require('../utils/storageUtil');
          const uploadResult = await downloadAndUploadToCategory(
            status.imageUrl,
            imageType,
            filename
          );

          processedImageUrl = uploadResult.publicUrl;
          console.log('✅ 生成的图片已上传到分类存储:', processedImageUrl);

          // 缓存结果，有效期30分钟
          taskImageCache.set(cacheKey, processedImageUrl);
          setTimeout(() => {
            taskImageCache.delete(cacheKey);
          }, 30 * 60 * 1000);

        } catch (uploadError) {
          console.error('❌ 上传生成图片到分类存储失败:', uploadError);
          console.error(`   原始图片URL: ${status.imageUrl}`);
          console.error(`   任务类型: ${taskType}`);
          console.error(`   目标图片类型: ${imageType}`);

          // 如果是网络相关错误，给出更友好的提示
          if (uploadError.message && uploadError.message.includes('网络连接不稳定')) {
            console.warn('⚠️  网络连接问题导致上传失败，将返回原始URL');
          }

          // 如果上传失败，仍然返回原始URL
          processedImageUrl = status.imageUrl;
        }
      }
    }

    // 返回处理后的状态
    const responseData = {
      ...status,
      imageUrl: processedImageUrl  // 使用处理后的URL
    };

    res.json({
      success: true,
      data: responseData,
      message: '查询任务状态成功'
    });

  } catch (error) {
    console.error('查询任务状态错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '查询任务状态失败'
    });
  }
});

module.exports = router 