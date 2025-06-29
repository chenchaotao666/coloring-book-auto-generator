const express = require('express')
const router = express.Router()
const CategoryModel = require('../models/categoryModel')

// 获取所有分类
router.get('/', async (req, res) => {
  try {
    const categories = await CategoryModel.getAll()
    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    console.error('获取分类列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分类列表失败',
      error: error.message
    })
  }
})

// 根据ID获取分类
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const category = await CategoryModel.getById(id)

    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      })
    }

    res.json({
      success: true,
      data: category
    })
  } catch (error) {
    console.error('获取分类详情失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分类详情失败',
      error: error.message
    })
  }
})

// 创建新分类
router.post('/', async (req, res) => {
  try {
    const { displayName, description, imageId, hotness } = req.body

    // 验证必填字段
    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: '显示名称为必填字段'
      })
    }

    const categoryData = {
      display_name: displayName,
      description: description || {},
      image_id: imageId,
      hotness: hotness || 0
    }

    const newCategory = await CategoryModel.create(categoryData)

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: newCategory
    })
  } catch (error) {
    console.error('创建分类失败:', error)
    res.status(500).json({
      success: false,
      message: '创建分类失败',
      error: error.message
    })
  }
})

// 更新分类
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { displayName, description, imageId, hotness } = req.body

    // 验证必填字段
    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: '显示名称为必填字段'
      })
    }

    // 检查分类是否存在
    const existingCategory = await CategoryModel.getById(id)
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      })
    }

    const categoryData = {
      display_name: displayName,
      description: description || {},
      image_id: imageId,
      hotness: hotness !== undefined ? hotness : existingCategory.hotness
    }

    const updatedCategory = await CategoryModel.update(id, categoryData)

    res.json({
      success: true,
      message: '分类更新成功',
      data: updatedCategory
    })
  } catch (error) {
    console.error('更新分类失败:', error)
    res.status(500).json({
      success: false,
      message: '更新分类失败',
      error: error.message
    })
  }
})

// 删除分类
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // 检查分类是否存在
    const existingCategory = await CategoryModel.getById(id)
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      })
    }

    const deleted = await CategoryModel.delete(id)

    if (deleted) {
      res.json({
        success: true,
        message: '分类删除成功'
      })
    } else {
      res.status(400).json({
        success: false,
        message: '删除分类失败'
      })
    }
  } catch (error) {
    console.error('删除分类失败:', error)

    if (error.message.includes('存在关联的图片')) {
      res.status(400).json({
        success: false,
        message: error.message
      })
    } else {
      res.status(500).json({
        success: false,
        message: '删除分类失败',
        error: error.message
      })
    }
  }
})

// 获取分类统计信息
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await CategoryModel.getStats()
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取分类统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分类统计失败',
      error: error.message
    })
  }
})

module.exports = router 