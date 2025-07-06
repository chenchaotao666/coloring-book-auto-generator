require('dotenv').config()
const mysql = require('mysql2/promise')

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'cct123456',
    database: process.env.DB_NAME || 'image_processing_db',
    charset: 'utf8mb4',
    timezone: '+08:00'
  }

  console.log('🔍 尝试连接数据库:')
  console.log(`📍 Host: ${config.host}`)
  console.log(`🚪 Port: ${config.port}`)
  console.log(`👤 User: ${config.user}`)
  console.log(`💾 Database: ${config.database}`)
  console.log('---')

  try {
    const connection = await mysql.createConnection(config)
    console.log('✅ 数据库连接成功！')

    // 测试基本查询
    const [rows] = await connection.execute('SELECT 1 as test')
    console.log('✅ 数据库查询测试成功')

    // 检查数据库是否存在
    const [databases] = await connection.execute('SHOW DATABASES')
    const dbExists = databases.some(db => db.Database === config.database)

    if (dbExists) {
      console.log(`✅ 数据库 '${config.database}' 存在`)

      // 检查表是否存在
      const [tables] = await connection.execute(`SHOW TABLES FROM ${config.database}`)
      console.log(`📋 数据库中的表: ${tables.length} 个`)
      tables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`)
      })
    } else {
      console.log(`⚠️  数据库 '${config.database}' 不存在`)
      console.log('需要创建数据库，请运行:')
      console.log(`CREATE DATABASE ${config.database};`)
    }

    await connection.end()
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    console.error('🔧 错误代码:', error.code)

    switch (error.code) {
      case 'ER_ACCESS_DENIED_ERROR':
        console.log('\n💡 解决建议 (访问被拒绝):')
        console.log('1. 检查用户名和密码是否正确')
        console.log('2. 确认数据库服务器允许来自您IP的连接')
        console.log('3. 检查用户是否有访问该数据库的权限')
        console.log('4. 如果是远程数据库，联系数据库管理员添加IP白名单')
        break
      case 'ER_BAD_DB_ERROR':
        console.log('\n💡 解决建议 (数据库不存在):')
        console.log(`1. 创建数据库: CREATE DATABASE ${config.database};`)
        console.log('2. 检查数据库名称是否正确')
        break
      case 'ECONNREFUSED':
        console.log('\n💡 解决建议 (连接被拒绝):')
        console.log('1. 检查MySQL服务是否已启动')
        console.log('2. 检查主机地址和端口是否正确')
        console.log('3. 检查防火墙设置')
        break
      case 'ETIMEDOUT':
        console.log('\n💡 解决建议 (连接超时):')
        console.log('1. 检查网络连接')
        console.log('2. 检查远程服务器是否可访问')
        console.log('3. 增加连接超时时间')
        break
      case 'ENOTFOUND':
        console.log('\n💡 解决建议 (主机未找到):')
        console.log('1. 检查主机地址是否正确')
        console.log('2. 检查DNS解析')
        break
      default:
        console.log('\n💡 通用解决建议:')
        console.log('1. 检查.env文件是否存在并配置正确')
        console.log('2. 确认MySQL服务正在运行')
        console.log('3. 查看详细错误信息进行进一步诊断')
    }

    console.log('\n📝 当前配置检查:')
    console.log('请确认您的.env文件包含以下配置:')
    console.log('DB_HOST=your_database_host')
    console.log('DB_PORT=3306')
    console.log('DB_USER=your_database_user')
    console.log('DB_PASSWORD=your_database_password')
    console.log('DB_NAME=image_processing_db')
  }
}

console.log('🚀 开始数据库连接测试...\n')
testConnection() 