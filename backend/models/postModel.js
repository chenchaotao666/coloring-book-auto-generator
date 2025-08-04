const { pool } = require('../database.js')

class PostModel {
  // 获取所有博客文章
  static async getAllPosts() {
    const query = `
      SELECT *
      FROM posts 
      ORDER BY created_at DESC
    `
    
    const [rows] = await pool.execute(query)
    
    // 解析 JSON 字段
    return rows.map(post => ({
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }))
  }

  // 根据ID获取博客文章
  static async getPostById(postId) {
    const query = `
      SELECT *
      FROM posts 
      WHERE post_id = ?
    `
    
    const [rows] = await pool.execute(query, [postId])
    
    if (rows.length === 0) {
      return null
    }
    
    const post = rows[0]
    return {
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }
  }

  // 根据slug获取博客文章
  static async getPostBySlug(slug) {
    const query = `
      SELECT *
      FROM posts 
      WHERE slug = ?
    `
    
    const [rows] = await pool.execute(query, [slug])
    
    if (rows.length === 0) {
      return null
    }
    
    const post = rows[0]
    return {
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }
  }

  // 创建博客文章
  static async createPost(postData) {
    const {
      post_id,
      title,
      slug,
      author,
      published_date,
      status = 'draft',
      featured_image,
      excerpt,
      content,
      meta_title,
      meta_description
    } = postData

    const query = `
      INSERT INTO posts (
        post_id,
        title,
        slug,
        author,
        published_date,
        status,
        featured_image,
        excerpt,
        content,
        meta_title,
        meta_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    const values = [
      post_id,
      JSON.stringify(title || {}),
      slug || null,
      author || null,
      published_date || new Date(),
      status || 'draft',
      featured_image || null,
      JSON.stringify(excerpt || {}),
      JSON.stringify(content || {}),
      JSON.stringify(meta_title || {}),
      JSON.stringify(meta_description || {})
    ]

    const [result] = await pool.execute(query, values)
    return result.insertId
  }

  // 更新博客文章
  static async updatePost(postId, postData) {
    const {
      title,
      slug,
      author,
      published_date,
      status,
      featured_image,
      excerpt,
      content,
      meta_title,
      meta_description
    } = postData

    const query = `
      UPDATE posts SET
        title = ?,
        slug = ?,
        author = ?,
        published_date = ?,
        status = ?,
        featured_image = ?,
        excerpt = ?,
        content = ?,
        meta_title = ?,
        meta_description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE post_id = ?
    `

    const values = [
      JSON.stringify(title || {}),
      slug || null,
      author || null,
      published_date || new Date(),
      status || 'draft',
      featured_image || null,
      JSON.stringify(excerpt || {}),
      JSON.stringify(content || {}),
      JSON.stringify(meta_title || {}),
      JSON.stringify(meta_description || {}),
      postId
    ]

    const [result] = await pool.execute(query, values)
    return result.affectedRows > 0
  }

  // 删除博客文章
  static async deletePost(postId) {
    const query = 'DELETE FROM posts WHERE post_id = ?'
    const [result] = await pool.execute(query, [postId])
    return result.affectedRows > 0
  }

  // 批量删除博客文章
  static async deletePosts(postIds) {
    if (!postIds || postIds.length === 0) {
      return 0
    }

    const placeholders = postIds.map(() => '?').join(',')
    const query = `DELETE FROM posts WHERE post_id IN (${placeholders})`
    const [result] = await pool.execute(query, postIds)
    return result.affectedRows
  }

  // 根据状态获取博客文章
  static async getPostsByStatus(status) {
    const query = `
      SELECT *
      FROM posts 
      WHERE status = ?
      ORDER BY published_date DESC
    `
    
    const [rows] = await pool.execute(query, [status])
    
    return rows.map(post => ({
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }))
  }

  // 根据作者获取博客文章
  static async getPostsByAuthor(author) {
    const query = `
      SELECT *
      FROM posts 
      WHERE author = ?
      ORDER BY created_at DESC
    `
    
    const [rows] = await pool.execute(query, [author])
    
    return rows.map(post => ({
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }))
  }

  // 搜索博客文章
  static async searchPosts(searchTerm, status = null) {
    let query = `
      SELECT 
        post_id,
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
        meta_description,
        created_at,
        updated_at
      FROM posts 
      WHERE (
        JSON_EXTRACT(title, '$.zh') LIKE ? OR 
        JSON_EXTRACT(title, '$.en') LIKE ? OR
        JSON_EXTRACT(content, '$.zh') LIKE ? OR 
        JSON_EXTRACT(content, '$.en') LIKE ? OR
        author LIKE ?
      )
    `
    
    const searchPattern = `%${searchTerm}%`
    const queryParams = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern]
    
    if (status) {
      query += ' AND status = ?'
      queryParams.push(status)
    }
    
    query += ' ORDER BY created_at DESC'
    
    const [rows] = await pool.execute(query, queryParams)
    
    return rows.map(post => ({
      ...post,
      title: this.parseJsonField(post.title),
      excerpt: this.parseJsonField(post.excerpt),
      content: this.parseJsonField(post.content),
      tags: [], // 默认空标签数组，因为表中没有tags字段
      meta_title: this.parseJsonField(post.meta_title),
      meta_description: this.parseJsonField(post.meta_description)
    }))
  }

  // 检查slug是否唯一
  static async isSlugUnique(slug, excludePostId = null) {
    let query = 'SELECT COUNT(*) as count FROM posts WHERE slug = ?'
    const params = [slug]
    
    if (excludePostId) {
      query += ' AND post_id != ?'
      params.push(excludePostId)
    }
    
    const [rows] = await pool.execute(query, params)
    return rows[0].count === 0
  }

  // 获取博客统计信息
  static async getPostStats() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM posts 
      GROUP BY status
      
      UNION ALL
      
      SELECT 
        'total' as status,
        COUNT(*) as count
      FROM posts
    `
    
    const [rows] = await pool.execute(query)
    
    const stats = {
      total: 0,
      published: 0,
      draft: 0
    }
    
    rows.forEach(row => {
      stats[row.status] = row.count
    })
    
    return stats
  }

  // 解析JSON字段的辅助方法
  static parseJsonField(field, defaultValue = {}) {
    if (!field) return defaultValue
    
    try {
      if (typeof field === 'string') {
        return JSON.parse(field)
      }
      return field
    } catch (error) {
      console.error('JSON解析错误:', error, 'field:', field)
      return defaultValue
    }
  }

  // 生成唯一的post_id
  static generatePostId() {
    return 'post_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }
}

module.exports = PostModel