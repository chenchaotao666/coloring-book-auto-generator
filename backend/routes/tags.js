const express = require('express')
const router = express.Router()
const TagModel = require('../models/tagModel')

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const tags = await TagModel.getAll()
    res.json({
      success: true,
      data: tags
    })
  } catch (error) {
    console.error('获取标签列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取标签列表失败',
      error: error.message
    })
  }
})

// 根据ID获取标签
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const tag = await TagModel.getById(id)

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      })
    }

    res.json({
      success: true,
      data: tag
    })
  } catch (error) {
    console.error('获取标签详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取标签详情失败',
      error: error.message
    })
  }
})

// 创建新标签
router.post('/', async (req, res) => {
  try {
    const { display_name, description } = req.body

    // 验证必填字段
    if (!display_name) {
      return res.status(400).json({
        success: false,
        message: '显示名称为必填字段'
      })
    }

    const tagData = {
      display_name,
      description: description || {}
    }

    const newTag = await TagModel.create(tagData)

    res.status(201).json({
      success: true,
      message: '标签创建成功',
      data: newTag
    })
  } catch (error) {
    console.error('创建标签失败:', error)
    res.status(500).json({
      success: false,
      message: '创建标签失败',
      error: error.message
    })
  }
})

// 更新标签
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { display_name, description } = req.body

    // 验证必填字段
    if (!display_name) {
      return res.status(400).json({
        success: false,
        message: '显示名称为必填字段'
      })
    }

    // 检查标签是否存在
    const existingTag = await TagModel.getById(id)
    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      })
    }

    const tagData = {
      display_name,
      description: description || {}
    }

    const updatedTag = await TagModel.update(id, tagData)

    res.json({
      success: true,
      message: '标签更新成功',
      data: updatedTag
    })
  } catch (error) {
    console.error('更新标签失败:', error)
    res.status(500).json({
      success: false,
      message: '更新标签失败',
      error: error.message
    })
  }
})

// 删除标签
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 检查标签是否存在
    const existingTag = await TagModel.getById(id)
    if (!existingTag) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      })
    }

    const deleted = await TagModel.delete(id)

    if (deleted) {
      res.json({
        success: true,
        message: '标签删除成功'
      })
    } else {
      res.status(400).json({
        success: false,
        message: '删除标签失败'
      })
    }
  } catch (error) {
    console.error('删除标签失败:', error)

    if (error.message.includes('存在关联的图片')) {
      res.status(400).json({
        success: false,
        message: error.message
      })
    } else {
      res.status(500).json({
        success: false,
        message: '删除标签失败',
        error: error.message
      })
    }
  }
})

// 获取标签统计信息
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await TagModel.getStats()
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取标签统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取标签统计失败',
      error: error.message
    })
  }
})

// 根据图片ID获取标签
router.get('/image/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params
    const tags = await TagModel.getByImageId(imageId)

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