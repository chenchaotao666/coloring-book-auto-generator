const { executeQuery } = require('../database')
const { v4: uuidv4 } = require('uuid')

class TagModel {
  // 获取所有标签
  static async getAll() {
    const sql = `
      SELECT tag_id, display_name, description, created_at, updated_at 
      FROM tags 
      ORDER BY created_at DESC
    `
    return await executeQuery(sql)
  }

  // 根据ID获取标签
  static async getById(tagId) {
    const sql = `
      SELECT tag_id, display_name, description, created_at, updated_at 
      FROM tags 
      WHERE tag_id = ?
    `
    const results = await executeQuery(sql, [tagId])
    return results[0] || null
  }

  // 根据多个ID获取标签
  static async getByIds(tagIds) {
    if (!tagIds || tagIds.length === 0) return []

    const placeholders = tagIds.map(() => '?').join(',')
    const sql = `
      SELECT tag_id, display_name, description, created_at, updated_at 
      FROM tags 
      WHERE tag_id IN (${placeholders})
    `
    return await executeQuery(sql, tagIds)
  }

  // 创建新标签
  static async create(tagData) {
    const { display_name, description } = tagData
    const tagId = uuidv4() // 生成UUID作为主键

    const sql = `
      INSERT INTO tags (tag_id, display_name, description) 
      VALUES (?, ?, ?)
    `
    const params = [
      tagId,
      JSON.stringify(display_name),
      JSON.stringify(description || {})
    ]

    await executeQuery(sql, params)
    return {
      tag_id: tagId,
      display_name,
      description: description || {}
    }
  }

  // 更新标签
  static async update(tagId, tagData) {
    const { display_name, description } = tagData

    const sql = `
      UPDATE tags 
      SET display_name = ?, description = ?
      WHERE tag_id = ?
    `
    const params = [
      JSON.stringify(display_name),
      JSON.stringify(description || {}),
      tagId
    ]

    await executeQuery(sql, params)
    return this.getById(tagId)
  }

  // 删除标签
  static async delete(tagId) {
    // 检查是否有关联的图片
    const checkSql = 'SELECT COUNT(*) as count FROM image_tags WHERE tag_id = ?'
    const checkResult = await executeQuery(checkSql, [tagId])

    if (checkResult[0].count > 0) {
      throw new Error('无法删除标签：存在关联的图片')
    }

    const sql = 'DELETE FROM tags WHERE tag_id = ?'
    const result = await executeQuery(sql, [tagId])
    return result.affectedRows > 0
  }

  // 获取标签统计信息
  static async getStats() {
    const sql = `
      SELECT 
        t.tag_id,
        t.display_name,
        t.description,
        COUNT(it.image_id) as image_count
      FROM tags t
      LEFT JOIN image_tags it ON t.tag_id = it.tag_id
      GROUP BY t.tag_id, t.display_name, t.description
      ORDER BY image_count DESC
    `
    return await executeQuery(sql)
  }

  // 根据图片ID获取标签
  static async getByImageId(imageId) {
    const sql = `
      SELECT t.tag_id, t.display_name, t.description, t.created_at, t.updated_at
      FROM tags t
      INNER JOIN image_tags it ON t.tag_id = it.tag_id
      WHERE it.image_id = ?
      ORDER BY t.tag_id
    `
    return await executeQuery(sql, [imageId])
  }
}

module.exports = TagModel 