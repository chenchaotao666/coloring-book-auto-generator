const mysql = require('mysql2/promise')
require('dotenv').config()

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'cct123456',
  database: process.env.DB_NAME || 'image_processing_db',
  charset: 'utf8mb4',
  timezone: '+08:00'
}

// 创建连接池
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,  // 60秒获取连接超时
  timeout: 60000,         // 60秒查询超时
  reconnect: true,        // 自动重连
  idleTimeout: 300000,    // 5分钟空闲超时
  maxIdle: 10             // 最大空闲连接数
})

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ 数据库连接成功')
    connection.release()
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    return false
  }
}

// 执行查询的通用方法
async function executeQuery(sql, params = []) {
  try {
    // 使用query而不是execute来解决参数问题
    const [rows] = await pool.query(sql, params)
    return rows
  } catch (error) {
    console.error('数据库查询错误:', error)
    throw error
  }
}

// 执行事务
async function executeTransaction(queries) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const results = []
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params)
      results.push(result)
    }

    await connection.commit()
    return results
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

module.exports = {
  pool,
  executeQuery,
  executeTransaction,
  testConnection
} 