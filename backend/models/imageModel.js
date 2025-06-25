const { executeQuery, executeTransaction } = require('../database')
const { v4: uuidv4 } = require('uuid')

class ImageModel {
  // 获取所有图片（分页查询）
  static async getAll(page = 1, limit = 20, filters = {}) {
    let whereConditions = []
    let params = []

    // 构建WHERE条件
    if (filters.category_id) {
      whereConditions.push('i.categoryId = ?')
      params.push(filters.category_id)
    }

    if (filters.type) {
      whereConditions.push('i.type = ?')
      params.push(filters.type)
    }

    if (filters.isPublic !== undefined) {
      whereConditions.push('i.isPublic = ?')
      params.push(filters.isPublic)
    }

    if (filters.userId) {
      whereConditions.push('i.userId = ?')
      params.push(filters.userId)
    }

    if (filters.search) {
      whereConditions.push('(JSON_EXTRACT(i.title, "$.zh") LIKE ? OR JSON_EXTRACT(i.title, "$.en") LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // 计算总数
    const countSql = `
      SELECT COUNT(*) as total 
      FROM images i 
      ${whereClause}
    `
    const countResult = await executeQuery(countSql, params)
    const total = countResult[0].total

    // 获取数据
    const offset = (page - 1) * limit
    const sql = `
      SELECT 
        i.id, i.name, i.defaultUrl, i.colorUrl, i.coloringUrl,
        i.title, i.description, i.type, i.ratio, i.isPublic, 
        i.createdAt, i.updatedAt, i.prompt, i.userId, i.categoryId, i.size, i.additionalInfo,
        c.display_name as category_display_name
      FROM images i
      LEFT JOIN categories c ON i.categoryId = c.category_id
      ${whereClause}
      ORDER BY i.createdAt DESC
      LIMIT ? OFFSET ?
    `
    // 创建新的参数数组，包含原有参数加上limit和offset
    const dataParams = [...params, limit, offset]

    const images = await executeQuery(sql, dataParams)

    // 为每个图片获取标签
    for (let image of images) {
      try {
        image.tags = await this.getImageTags(image.id)
      } catch (error) {
        console.error(`获取图片 ${image.id} 标签失败:`, error)
        image.tags = [] // 设置默认空数组
      }
    }

    return {
      data: images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }

  // 根据ID获取图片
  static async getById(imageId) {
    const sql = `
      SELECT 
        i.id, i.name, i.defaultUrl, i.colorUrl, i.coloringUrl,
        i.title, i.description, i.type, i.ratio, i.isPublic, 
        i.createdAt, i.updatedAt, i.prompt, i.userId, i.categoryId, i.size, i.additionalInfo,
        c.display_name as category_display_name
      FROM images i
      LEFT JOIN categories c ON i.categoryId = c.category_id
      WHERE i.id = ?
    `
    const results = await executeQuery(sql, [imageId])

    if (results.length === 0) return null

    const image = results[0]
    try {
      image.tags = await this.getImageTags(image.id)
    } catch (error) {
      console.error(`获取图片 ${image.id} 标签失败:`, error)
      image.tags = [] // 设置默认空数组
    }

    return image
  }



  // 创建新图片
  static async create(imageData) {
    const {
      name, defaultUrl, colorUrl, coloringUrl, title, description,
      type, ratio, isPublic, prompt, userId, category_id, size, additionalInfo, tagIds
    } = imageData

    const imageId = uuidv4() // 使用UUID作为主键

    const queries = []

    // 插入图片记录
    const insertImageSql = `
      INSERT INTO images (
        id, name, defaultUrl, colorUrl, coloringUrl, title, description,
        type, ratio, isPublic, prompt, userId, categoryId, size, additionalInfo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const insertImageParams = [
      imageId,
      JSON.stringify(name),
      defaultUrl,
      colorUrl,
      coloringUrl,
      JSON.stringify(title),
      JSON.stringify(description),
      type,
      ratio,
      isPublic,
      JSON.stringify(prompt),
      userId,
      category_id,
      size,
      JSON.stringify(additionalInfo)
    ]

    queries.push({ sql: insertImageSql, params: insertImageParams })

    const results = await executeTransaction(queries)

    // 添加标签关联
    if (tagIds && tagIds.length > 0) {
      await this.updateImageTags(imageId, tagIds)
    }

    return this.getById(imageId)
  }

  // 更新图片
  static async update(imageId, imageData) {
    const {
      name, defaultUrl, colorUrl, coloringUrl, title, description,
      type, ratio, isPublic, prompt, userId, category_id, size, additionalInfo, tagIds
    } = imageData

    const sql = `
      UPDATE images SET
        name = ?, defaultUrl = ?, colorUrl = ?, coloringUrl = ?, title = ?, description = ?,
        type = ?, ratio = ?, isPublic = ?, prompt = ?, userId = ?, categoryId = ?, size = ?, additionalInfo = ?
      WHERE id = ?
    `
    const params = [
      JSON.stringify(name),
      defaultUrl,
      colorUrl,
      coloringUrl,
      JSON.stringify(title),
      JSON.stringify(description),
      type,
      ratio,
      isPublic,
      JSON.stringify(prompt),
      userId,
      category_id,
      size,
      JSON.stringify(additionalInfo),
      imageId
    ]

    await executeQuery(sql, params)

    // 更新标签关联
    if (tagIds !== undefined) {
      await this.updateImageTags(imageId, tagIds)
    }

    return this.getById(imageId)
  }

  // 删除图片
  static async delete(imageId) {
    const queries = [
      { sql: 'DELETE FROM image_tags WHERE image_id = ?', params: [imageId] },
      { sql: 'DELETE FROM images WHERE id = ?', params: [imageId] }
    ]

    const results = await executeTransaction(queries)
    return results[1].affectedRows > 0
  }

  // 获取图片的标签
  static async getImageTags(imageId) {
    const sql = `
      SELECT t.tag_id, t.display_name, t.description
      FROM tags t
      INNER JOIN image_tags it ON t.tag_id = it.tag_id
      WHERE it.image_id = ?
      ORDER BY t.tag_id
    `
    return await executeQuery(sql, [imageId])
  }

  // 更新图片标签
  static async updateImageTags(imageId, tagIds) {
    const queries = []

    // 删除现有标签关联
    queries.push({ sql: 'DELETE FROM image_tags WHERE image_id = ?', params: [imageId] })

    // 添加新的标签关联
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        queries.push({
          sql: 'INSERT INTO image_tags (image_id, tag_id) VALUES (?, ?)',
          params: [imageId, tagId]
        })
      }
    }

    await executeTransaction(queries)
  }

  // 更新图片分类
  static async updateCategory(imageId, categoryId) {
    const sql = 'UPDATE images SET categoryId = ? WHERE id = ?'
    await executeQuery(sql, [categoryId, imageId])
    return this.getById(imageId)
  }

  // 根据分类获取图片
  static async getByCategory(categoryId, page = 1, limit = 20) {
    return this.getAll(page, limit, { category_id: categoryId })
  }

  // 根据标签获取图片
  static async getByTag(tagId, page = 1, limit = 20) {
    const offset = (page - 1) * limit

    const countSql = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM images i
      INNER JOIN image_tags it ON i.id = it.image_id
      WHERE it.tag_id = ?
    `
    const countResult = await executeQuery(countSql, [tagId])
    const total = countResult[0].total

    const sql = `
      SELECT DISTINCT
        i.id, i.name, i.defaultUrl, i.colorUrl, i.coloringUrl,
        i.title, i.description, i.type, i.ratio, i.isPublic, 
        i.createdAt, i.updatedAt, i.prompt, i.userId, i.categoryId, i.size, i.additionalInfo,
        c.display_name as category_display_name
      FROM images i
      INNER JOIN image_tags it ON i.id = it.image_id
      LEFT JOIN categories c ON i.categoryId = c.category_id
      WHERE it.tag_id = ?
      ORDER BY i.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const images = await executeQuery(sql, [tagId, limit, offset])

    // 为每个图片获取标签
    for (let image of images) {
      image.tags = await this.getImageTags(image.id)
    }

    return {
      data: images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  }
}

module.exports = ImageModel 