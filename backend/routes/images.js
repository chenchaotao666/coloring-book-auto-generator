const express = require('express')
const router = express.Router()
const ImageModel = require('../models/imageModel')
const CategoryModel = require('../models/categoryModel')
const TagModel = require('../models/tagModel')

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
          name: cat.display_name,
          description: cat.description,
          imageId: cat.image_id
        })),
        tags: tags.map(tag => ({
          id: tag.tag_id,
          name: tag.display_name,
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
          name: imageData.name || { zh: imageData.title || `图片${i + 1}`, en: imageData.title || `Image ${i + 1}` },
          title: imageData.title ? { zh: imageData.title, en: imageData.title } : { zh: `生成的图片${i + 1}`, en: `Generated Image ${i + 1}` },
          description: imageData.description ? { zh: imageData.description, en: imageData.description } : { zh: '从前端生成的图片', en: 'Generated from frontend' },
          defaultUrl: imageData.imagePath || imageData.defaultUrl,
          colorUrl: imageData.colorUrl || null,
          coloringUrl: imageData.coloringUrl || null,
          type: imageData.type || 'generated',
          ratio: imageData.imageRatio || imageData.ratio || '1:1',
          isPublic: imageData.isPublic !== undefined ? imageData.isPublic : true,
          prompt: imageData.prompt ? { zh: imageData.prompt, en: imageData.prompt } : { zh: '前端生成', en: 'Frontend generated' },
          userId: imageData.userId || 'frontend_user',
          category_id: imageData.categoryId || imageData.category_id || null,
          size: imageData.size || null,
          additionalInfo: {
            source: 'frontend_generation',
            generatedAt: new Date().toISOString(),
            originalData: imageData,
            ...imageData.additionalInfo
          },
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
      name: imageData.name || { zh: imageData.title, en: imageData.title },
      title: imageData.title ? { zh: imageData.title, en: imageData.title } : { zh: '选中的图片', en: 'Selected Image' },
      description: imageData.description ? { zh: imageData.description, en: imageData.description } : { zh: '从前端选中保存的图片', en: 'Selected and saved from frontend' },
      defaultUrl: imageData.imagePath || imageData.defaultUrl,
      colorUrl: imageData.colorUrl || null,
      coloringUrl: imageData.coloringUrl || null,
      type: imageData.type || 'selected',
      ratio: imageData.imageRatio || imageData.ratio || '1:1',
      isPublic: imageData.isPublic !== undefined ? imageData.isPublic : true,
      prompt: imageData.prompt ? { zh: imageData.prompt, en: imageData.prompt } : { zh: '前端选中', en: 'Frontend selected' },
      userId: imageData.userId || 'frontend_user',
      category_id: imageData.categoryId || imageData.category_id || null,
      size: imageData.size || null,
      additionalInfo: {
        source: 'frontend_selection',
        selectedAt: new Date().toISOString(),
        originalData: imageData,
        ...imageData.additionalInfo
      },
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
      type, ratio, isPublic, prompt, userId, category_id, size, additionalInfo, tagIds
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
      defaultUrl,
      colorUrl,
      coloringUrl,
      title,
      description: description || {},
      type,
      ratio: ratio || '1:1',
      isPublic: isPublic || false,
      prompt: prompt || {},
      userId,
      category_id,
      size,
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
      type, ratio, isPublic, prompt, userId, category_id, size, additionalInfo, tagIds
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
      name: name || {},
      defaultUrl,
      colorUrl,
      coloringUrl,
      title,
      description: description || {},
      type,
      ratio: ratio || '1:1',
      isPublic: isPublic || false,
      prompt: prompt || {},
      userId,
      category_id,
      size,
      additionalInfo: additionalInfo || {},
      tagIds
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
    const { category_id } = req.body

    // 检查图片是否存在
    const existingImage = await ImageModel.getById(id)
    if (!existingImage) {
      return res.status(404).json({
        success: false,
        message: '图片不存在'
      })
    }

    const updatedImage = await ImageModel.updateCategory(id, category_id)

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

module.exports = router 