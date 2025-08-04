const express = require('express')
const router = express.Router()
const PostModel = require('../models/postModel')

// 错误处理中间件
const handleError = (res, error, message = '操作失败') => {
  console.error('Posts API错误:', error)
  res.status(500).json({
    success: false,
    message: message + ': ' + error.message,
    error: error.message
  })
}

// 验证必需字段的中间件
const validatePostData = (req, res, next) => {
  const { title, slug, author, content } = req.body
  
  // 检查必需字段
  if (!title || !slug || !author || !content) {
    return res.status(400).json({
      success: false,
      message: '缺少必需字段：title, slug, author, content'
    })
  }
  
  // 检查多语言字段格式
  if (typeof title !== 'object' || typeof content !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'title 和 content 必须是多语言对象格式'
    })
  }
  
  next()
}

// 获取所有博客文章
router.get('/', async (req, res) => {
  try {
    const { status, author, search } = req.query
    
    let posts
    if (search) {
      posts = await PostModel.searchPosts(search, status)
    } else if (status) {
      posts = await PostModel.getPostsByStatus(status)
    } else if (author) {
      posts = await PostModel.getPostsByAuthor(author)
    } else {
      posts = await PostModel.getAllPosts()
    }
    
    res.json({
      success: true,
      data: posts,
      count: posts.length
    })
  } catch (error) {
    handleError(res, error, '获取博客文章失败')
  }
})

// 根据ID获取单个博客文章
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const post = await PostModel.getPostById(id)
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '博客文章不存在'
      })
    }
    
    res.json({
      success: true,
      data: post
    })
  } catch (error) {
    handleError(res, error, '获取博客文章失败')
  }
})

// 根据slug获取博客文章
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params
    const post = await PostModel.getPostBySlug(slug)
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: '博客文章不存在'
      })
    }
    
    res.json({
      success: true,
      data: post
    })
  } catch (error) {
    handleError(res, error, '获取博客文章失败')
  }
})

// 创建博客文章
router.post('/', validatePostData, async (req, res) => {
  try {
    const {
      title,
      slug,
      author,
      published_date,
      status = 'draft',
      featured_image,
      excerpt,
      content,
      tags = [],
      meta_title,
      meta_description
    } = req.body
    
    // 检查slug唯一性
    const isSlugUnique = await PostModel.isSlugUnique(slug)
    if (!isSlugUnique) {
      return res.status(400).json({
        success: false,
        message: 'Slug已存在，请使用不同的slug'
      })
    }
    
    // 生成post_id
    const post_id = PostModel.generatePostId()
    
    const postData = {
      post_id,
      title,
      slug,
      author,
      published_date: published_date || new Date(),
      status,
      featured_image,
      excerpt: excerpt || { en: '', zh: '' },
      content,
      tags,
      meta_title: meta_title || { en: '', zh: '' },
      meta_description: meta_description || { en: '', zh: '' }
    }
    
    await PostModel.createPost(postData)
    
    // 返回创建的文章
    const newPost = await PostModel.getPostById(post_id)
    
    res.status(201).json({
      success: true,
      message: '博客文章创建成功',
      data: newPost
    })
  } catch (error) {
    handleError(res, error, '创建博客文章失败')
  }
})

// 更新博客文章
router.put('/:id', validatePostData, async (req, res) => {
  try {
    const { id } = req.params
    const {
      title,
      slug,
      author,
      published_date,
      status,
      featured_image,
      excerpt,
      content,
      tags,
      meta_title,
      meta_description
    } = req.body
    
    // 检查文章是否存在
    const existingPost = await PostModel.getPostById(id)
    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: '博客文章不存在'
      })
    }
    
    // 检查slug唯一性（排除当前文章）
    if (slug !== existingPost.slug) {
      const isSlugUnique = await PostModel.isSlugUnique(slug, id)
      if (!isSlugUnique) {
        return res.status(400).json({
          success: false,
          message: 'Slug已存在，请使用不同的slug'
        })
      }
    }
    
    const postData = {
      title,
      slug,
      author,
      published_date,
      status,
      featured_image,
      excerpt,
      content,
      tags,
      meta_title,
      meta_description
    }
    
    const updated = await PostModel.updatePost(id, postData)
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: '更新失败，博客文章不存在'
      })
    }
    
    // 返回更新后的文章
    const updatedPost = await PostModel.getPostById(id)
    
    res.json({
      success: true,
      message: '博客文章更新成功',
      data: updatedPost
    })
  } catch (error) {
    handleError(res, error, '更新博客文章失败')
  }
})

// 删除博客文章
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // 检查文章是否存在
    const existingPost = await PostModel.getPostById(id)
    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: '博客文章不存在'
      })
    }
    
    const deleted = await PostModel.deletePost(id)
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '删除失败，博客文章不存在'
      })
    }
    
    res.json({
      success: true,
      message: '博客文章删除成功'
    })
  } catch (error) {
    handleError(res, error, '删除博客文章失败')
  }
})

// 批量删除博客文章
router.delete('/', async (req, res) => {
  try {
    const { postIds } = req.body
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的博客文章ID数组'
      })
    }
    
    const deletedCount = await PostModel.deletePosts(postIds)
    
    res.json({
      success: true,
      message: `成功删除 ${deletedCount} 篇博客文章`,
      deletedCount
    })
  } catch (error) {
    handleError(res, error, '批量删除博客文章失败')
  }
})

// 获取博客统计信息
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await PostModel.getPostStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    handleError(res, error, '获取博客统计信息失败')
  }
})

// 检查slug唯一性
router.post('/check-slug', async (req, res) => {
  try {
    const { slug, excludePostId } = req.body
    
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: '请提供slug'
      })
    }
    
    const isUnique = await PostModel.isSlugUnique(slug, excludePostId)
    
    res.json({
      success: true,
      data: {
        slug,
        isUnique
      }
    })
  } catch (error) {
    handleError(res, error, '检查slug唯一性失败')
  }
})

// 发布/取消发布博客文章
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    if (!status || !['draft', 'published'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态必须是 draft 或 published'
      })
    }
    
    // 检查文章是否存在
    const existingPost = await PostModel.getPostById(id)
    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: '博客文章不存在'
      })
    }
    
    const postData = {
      ...existingPost,
      status,
      published_date: status === 'published' ? new Date() : existingPost.published_date
    }
    
    const updated = await PostModel.updatePost(id, postData)
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: '更新状态失败'
      })
    }
    
    // 返回更新后的文章
    const updatedPost = await PostModel.getPostById(id)
    
    res.json({
      success: true,
      message: `博客文章已${status === 'published' ? '发布' : '设为草稿'}`,
      data: updatedPost
    })
  } catch (error) {
    handleError(res, error, '更新博客文章状态失败')
  }
})

module.exports = router