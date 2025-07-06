# 远程数据库连接配置

## 问题诊断

您遇到的错误表明：
```
Access denied for user 'root'@'27.44.20.186' (using password: YES)
```

这意味着：
1. 您正在从IP `27.44.20.186` 连接远程MySQL数据库
2. MySQL服务器拒绝了来自此IP的root用户连接
3. 密码验证通过了，但用户权限不足

## 解决方案

### 方案1：配置.env文件连接远程数据库

在 `backend` 目录下创建 `.env` 文件：

```env
# 服务器端口
PORT=3002

# 远程MySQL数据库配置
DB_HOST=your_remote_mysql_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=image_processing_db

# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your_deepseek_key_here

# KIEAI图片生成API配置
KIEAI_API_URL=https://kieai.erweima.ai/api/v1
KIEAI_AUTH_TOKEN=your_real_kieai_token_here
```

### 方案2：数据库服务器端权限配置

如果您有数据库服务器的管理权限，需要在MySQL服务器上执行：

```sql
-- 方式1：为特定IP创建用户
CREATE USER 'your_app_user'@'27.44.20.186' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON image_processing_db.* TO 'your_app_user'@'27.44.20.186';
FLUSH PRIVILEGES;

-- 方式2：允许任何IP连接（不太安全）
CREATE USER 'your_app_user'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON image_processing_db.* TO 'your_app_user'@'%';
FLUSH PRIVILEGES;

-- 方式3：修改现有root用户权限（最不安全）
GRANT ALL PRIVILEGES ON *.* TO 'root'@'%' IDENTIFIED BY 'your_root_password';
FLUSH PRIVILEGES;
```

### 方案3：使用本地数据库

如果远程连接配置复杂，建议使用本地MySQL：

```env
# 本地MySQL数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_mysql_password
DB_NAME=image_processing_db
```

## 推荐配置步骤

### 1. 检查当前配置
创建测试脚本 `backend/test-db-connection.js`：

```javascript
require('dotenv').config()
const mysql = require('mysql2/promise')

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'cct123456',
    database: process.env.DB_NAME || 'image_processing_db'
  }

  console.log('尝试连接数据库:')
  console.log(`Host: ${config.host}`)
  console.log(`Port: ${config.port}`)
  console.log(`User: ${config.user}`)
  console.log(`Database: ${config.database}`)
  console.log('---')

  try {
    const connection = await mysql.createConnection(config)
    console.log('✅ 数据库连接成功！')
    await connection.end()
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    console.error('错误代码:', error.code)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n解决建议:')
      console.log('1. 检查用户名和密码是否正确')
      console.log('2. 确认数据库服务器允许来自您IP的连接')
      console.log('3. 检查用户是否有访问该数据库的权限')
    }
  }
}

testConnection()
```

### 2. 运行测试
```bash
cd backend
node test-db-connection.js
```

### 3. 创建数据库和表结构

如果连接成功，运行数据库初始化脚本：
```bash
cd backend
node -e "require('./database').testConnection()"
```

## 安全建议

1. **不要使用root用户**：创建专门的应用用户
2. **限制IP访问**：只允许特定IP连接
3. **使用强密码**：避免使用简单密码
4. **最小权限原则**：只授予必要的数据库权限

## 常见错误及解决方案

| 错误代码 | 描述 | 解决方案 |
|---------|------|----------|
| `ER_ACCESS_DENIED_ERROR` | 访问被拒绝 | 检查用户名、密码和IP权限 |
| `ER_BAD_DB_ERROR` | 数据库不存在 | 创建数据库或检查数据库名 |
| `ECONNREFUSED` | 连接被拒绝 | 检查主机地址和端口 |
| `ETIMEDOUT` | 连接超时 | 检查网络连接和防火墙 |

## 快速解决方案

如果您需要快速解决问题，建议：

1. **使用本地数据库**：
   ```bash
   # 安装MySQL（如果没有）
   # Windows: 下载MySQL安装包
   # macOS: brew install mysql
   # Linux: apt-get install mysql-server
   
   # 启动MySQL服务
   # 创建数据库
   mysql -u root -p
   CREATE DATABASE image_processing_db;
   ```

2. **配置本地.env**：
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_local_password
   DB_NAME=image_processing_db
   ```

这样可以避免远程连接的复杂配置问题。 