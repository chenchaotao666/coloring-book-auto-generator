const { executeQuery } = require('../database')
const { v4: uuidv4 } = require('uuid')

class CategoryModel {
  // 获取所有分类
  static async getAll() {
    console.log('🔍 CategoryModel.getAll() 开始执行...')
    const sql = `
      SELECT category_id, display_name, description, seo_title, seo_desc, image_id, hotness,
             created_at, updated_at 
      FROM categories 
      ORDER BY created_at DESC
    `
    console.log('📝 执行SQL:', sql.replace(/\s+/g, ' ').trim())
    
    const startTime = Date.now()
    const result = await executeQuery(sql)
    const queryTime = Date.now() - startTime
    
    console.log(`💾 数据库查询完成，耗时: ${queryTime}ms，返回: ${result.length} 条记录`)
    return result
  }

  // 根据ID获取分类
  static async getById(categoryId) {
    const sql = `
      SELECT category_id, display_name, description, seo_title, seo_desc, image_id, hotness,
             created_at, updated_at 
      FROM categories 
      WHERE category_id = ?
    `
    const results = await executeQuery(sql, [categoryId])
    return results[0] || null
  }

  // 创建新分类
  static async create(categoryData) {
    const { display_name, description, seo_title, seo_desc, image_id, hotness } = categoryData
    const categoryId = uuidv4() // 生成UUID作为主键

    const sql = `
      INSERT INTO categories (category_id, display_name, description, seo_title, seo_desc, image_id, hotness) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    const params = [
      categoryId,
      JSON.stringify(display_name),
      JSON.stringify(description),
      JSON.stringify(seo_title),
      JSON.stringify(seo_desc),
      image_id || null,
      hotness || 0
    ]

    await executeQuery(sql, params)
    return {
      category_id: categoryId,
      display_name,
      description,
      seo_title,
      seo_desc,
      image_id,
      hotness: hotness || 0
    }
  }

  // 更新分类
  static async update(categoryId, categoryData) {
    const { display_name, description, seo_title, seo_desc, image_id, hotness } = categoryData

    const sql = `
      UPDATE categories 
      SET display_name = ?, description = ?, seo_title = ?, seo_desc = ?, image_id = ?, hotness = ?
      WHERE category_id = ?
    `
    const params = [
      JSON.stringify(display_name),
      JSON.stringify(description),
      JSON.stringify(seo_title),
      JSON.stringify(seo_desc),
      image_id || null,
      hotness !== undefined ? hotness : 0,
      categoryId
    ]

    await executeQuery(sql, params)
    return this.getById(categoryId)
  }

  // 删除分类
  static async delete(categoryId) {
    // 检查是否有关联的图片
    const checkSql = 'SELECT COUNT(*) as count FROM images WHERE categoryId = ?'
    const checkResult = await executeQuery(checkSql, [categoryId])

    if (checkResult[0].count > 0) {
      throw new Error('无法删除分类：存在关联的图片')
    }

    const sql = 'DELETE FROM categories WHERE category_id = ?'
    const result = await executeQuery(sql, [categoryId])
    return result.affectedRows > 0
  }

  // 获取分类统计信息
  static async getStats() {
    const sql = `
      SELECT 
        c.category_id,
        c.display_name,
        COUNT(i.id) as image_count
      FROM categories c
      LEFT JOIN images i ON c.category_id = i.categoryId
      GROUP BY c.category_id, c.display_name
      ORDER BY image_count DESC
    `
    return await executeQuery(sql)
  }
}

module.exports = CategoryModel 