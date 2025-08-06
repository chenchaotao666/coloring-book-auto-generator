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
  connectionLimit: 15,        // 增加连接数
  queueLimit: 0,
  acquireTimeout: 30000,      // 30秒获取连接超时
  timeout: 30000,             // 30秒查询超时
  reconnect: true,            // 自动重连
  idleTimeout: 300000,        // 5分钟空闲超时
  maxIdle: 10,                // 最大空闲连接数
  // 添加重连配置
  reconnectTimeout: 2000,     // 重连间隔2秒
  maxReconnects: 3,           // 最大重连次数
  // 启用keep-alive
  keepAliveInitialDelay: 0,
  enableKeepAlive: true
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

// 执行查询的通用方法（带重试机制）
async function executeQuery(sql, params = [], maxRetries = 3) {
  let lastError
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 使用query而不是execute来解决参数问题
      const [rows] = await pool.query(sql, params)
      return rows
    } catch (error) {
      lastError = error
      console.error(`数据库查询错误 (尝试 ${attempt}/${maxRetries}):`, error.message)
      
      // 如果是连接超时或网络错误，尝试重试
      if (attempt < maxRetries && (
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED'
      )) {
        console.log(`等待 ${attempt * 1000}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
        continue
      }
      
      // 其他错误或达到最大重试次数，直接抛出
      break
    }
  }
  
  console.error('数据库查询最终失败:', lastError)
  throw lastError
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