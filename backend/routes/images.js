const express = require('express')
const router = express.Router()
const ImageModel = require('../models/imageModel')
const CategoryModel = require('../models/categoryModel')
const TagModel = require('../models/tagModel')
const ImageColoringService = require('../services/imageColoringService')

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
      type, ratio, isPublic, hotness, prompt, userId, category_id, size, additionalInfo, tagIds
    } = req.body

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
      isPublic: isPublic !== undefined ? isPublic : false,
      hotness: hotness || 0,
      prompt: prompt || {},
      userId: userId || null,
      categoryId: category_id || null,
      size: size || null,
      additionalInfo: additionalInfo || {},
      tagIds: tagIds || []
    }

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
      type, ratio, isPublic, hotness, prompt, userId, categoryId, size, additionalInfo, tagIds
    } = req.body

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
      defaultUrl: defaultUrl || existingImage.defaultUrl,
      colorUrl: colorUrl || existingImage.colorUrl,
      coloringUrl: coloringUrl || existingImage.coloringUrl,
      title: title ?
        (typeof title === 'object' ? title : { zh: title }) :
        existingImage.title,
      description: description ?
        (typeof description === 'object' ? description : { zh: description }) :
        (existingImage.description || {}),
      type,
      ratio: ratio || '1:1',
      isPublic: isPublic !== undefined ? isPublic : false,
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

// 图片上色生成
router.post('/color-generate', async (req, res) => {
  try {
    console.log('图片上色生成开始');
    const { imageId, prompt, options = {} } = req.body;

    // 验证必要参数
    if (!imageId) {
      return res.status(400).json({
        success: false,
        message: '请提供图片ID'
      });
    }

    // 获取原始图片信息
    const originalImage = await ImageModel.getById(imageId);
    if (!originalImage) {
      return res.status(404).json({
        success: false,
        message: '原始图片不存在'
      });
    }

    // 构造上色prompt
    const colorPrompt = prompt ?
      `${prompt},用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明` :
      '用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明';

    // 调用图片上色服务
    const coloringResult = await ImageColoringService.generateColoredImage({
      imageUrl: originalImage.defaultUrl,
      prompt: colorPrompt,
      options: {
        ratio: originalImage.ratio || '1:1',
        isEnhance: options.isEnhance || false,
        nVariants: options.nVariants || 1,
        ...options
      }
    });

    res.json({
      success: true,
      message: '图片上色任务已创建',
      data: {
        imageId,
        originalImage,
        coloringResult
      }
    });

  } catch (error) {
    console.error('图片上色生成失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上色生成失败',
      error: error.message
    });
  }
});

// 检查上色任务状态并更新图片
router.get('/color-task/:taskId/:imageId', async (req, res) => {
  try {
    const { taskId, imageId } = req.params;
    console.log(`检查上色任务状态: taskId=${taskId}, imageId=${imageId}`);

    const taskStatus = await ImageColoringService.checkColoringTaskStatus(taskId);
    console.log('任务状态检查结果:', taskStatus);

    // 如果任务完成，更新图片记录
    if (taskStatus.status === 'completed' && taskStatus.coloringUrl) {
      console.log('任务已完成，更新数据库图片记录');
      console.log('最终彩色图片URL:', taskStatus.coloringUrl);
      console.log('原始AI生成URL:', taskStatus.originalColoringUrl);

      const updatedImage = await ImageModel.update(imageId, {
        coloringUrl: taskStatus.coloringUrl
      });

      console.log('数据库更新成功:', updatedImage?.id);
      taskStatus.updatedImage = updatedImage;
    }

    res.json({
      success: true,
      data: taskStatus
    });

  } catch (error) {
    console.error('检查上色任务状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查上色任务状态失败',
      error: error.message
    });
  }
});

module.exports = router 