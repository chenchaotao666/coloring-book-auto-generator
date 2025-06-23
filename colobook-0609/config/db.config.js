const mysql = require('mysql2/promise');
const envConfig = require('./env.config');

const dbConfig = {
  host: envConfig.DB_HOST,
  user: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 直接创建连接池（不需要额外的 promise() 调用）
const pool = mysql.createPool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败：', error);
    throw error; // 可以选择抛出错误让调用方处理
  }
}

// 初始化时测试连接（可选）
testConnection().catch(console.error);

// 获取数据库连接
async function getConnection() {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('获取数据库连接失败：', error);
    throw error;
  }
}

 module.exports = async function getConnection() {
  return await pool.getConnection();
}; 

/* // 导出getConnection函数
module.exports = {
  getConnection
}; */