const getConnection = require('../config/db.config');
const envConfig = require('../config/env.config');
//### 用户类型说明
//| 类型 | 名称     | 说明          | 权限                       |
//| ---- | -------- | ------------- | -------------------------- |
//| free | 免费用户 | 注册即可获得  | 基础功能，每日限制生成次数 |
//| lite | 轻量版   | 月费会员      | 增加生成次数，部分高级功能 |
//| pro  | 专业版   | 月费/年费会员 | 无限生成，全部高级功能     |



/* 
async function createUser(user) {
  console.log('Creating new user:', user);
  const connection = await getConnection();
  const [result] = await connection.query(
    'INSERT INTO users (username, email, password_hash, avatar_id, useravailableScore, role, membershipLevel,  refreshToken, createdAt, updatedAt, balance, membershipExpiry, firstlogin_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0, NULL, NULL)',
    [
      user.username,    //用户界面三个选项，用户名
      user.email,        //用户email
      user.password_hash, //用户密码
      envConfig.DEFAULT_AVATAR_ID, // 固定默认值，用默认头像
      envConfig.CREDIT_DEFAULT, // 默认登录送40积分
      'user',           // 固定都不是管理员
      'free',           // 固定都是free用户
      null,              // 固定，超时机制
      null
    ]
  );
  console.log('User created with ID:', result.insertId);
  return result.insertId;
}
 */
async function createUser(user) {
  let connection;
  try {
    console.log('开始创建新用户:', user);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [result] = await connection.query(
      'INSERT INTO users (username, email, password_hash, avatar_id, useravailableScore, role, membershipLevel, refreshToken, createdAt, updatedAt, balance, membershipExpiry, firstlogin_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0, NULL, NULL)',
      [
        user.username,
        user.email,
        user.password_hash,
        envConfig.USR_DEFAULT_AVATAR,
        envConfig.CREDIT_DEFAULT,
        'user',
        'free',
        null
      ]
    );
    console.log(`用户创建成功，ID为：${result.insertId}`);

    return result.insertId;
  } catch (error) {
    console.error('创建新用户时发生错误:', error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}



async function createGoogleUser(user) {
  console.log('Creating new Google user:', user);
  const connection = await getConnection();
  //const [result] = await connection.query(
  // 'INSERT INTO users (username, email, googleId) VALUES (?, ?, ?)',
  //  [user.username, user.email, user.googleId]
  // );
  //原来的设计考虑增加一个字段存放googleID ,现在使用password_hash来存放Googleid
  const [result] = await connection.query(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    [user.username, user.email, user.googleId]
  );
  console.log('Google user created with ID:', result.insertId);
  return result.insertId;
}






//通过email 找用户，合理，是唯一的
/* async function findUserByEmail(email) {
  console.log('Finding user by email:', email);
  const connection = await getConnection();
  const [results] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
  console.log('User found:', results[0]);
  return results[0] || null;
} */
async function findUserByEmail(email) {
  let connection;
  try {
    console.log(`开始通过邮箱查找用户，邮箱：${email}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log(`查询结果：`, results[0]);

    return results[0] || null;
  } catch (error) {
    console.error(`通过邮箱查找用户时发生错误，邮箱：${email}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}


//通过id 找用户，合理，是唯一的
/* async function findUserById(_id) {
  console.log('Finding user by ID:', _id);
  const connection = await getConnection();
  const [results] = await connection.query('SELECT * FROM users WHERE _id = ?', [_id]);
  console.log('User found:', results[0]);
  return results[0] || null;
} */
async function findUserById(_id) {
  let connection;
  try {
    console.log(`开始通过 ID 查找用户，ID：${_id}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query('SELECT * FROM users WHERE _id = ?', [_id]);
    console.log(`查询结果：`, results[0]);

    return results[0] || null;
  } catch (error) {
    console.error(`通过 ID 查找用户时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
//通过用户名查找用户，这个可能找出很多，那里用到的？？
/* async function findUserByUsername(username) {
  console.log('Finding user by username:', username);
  const connection = await getConnection();
  const [results] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
  console.log('User found:', results[0]);
  return results[0] || null;
}
 */
async function findUserByUsername(username) {
  let connection;
  try {
    console.log(`开始通过用户名查找用户，用户名：${username}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    console.log(`查询结果：`, results[0]);

    return results[0] || null;
  } catch (error) {
    console.error(`通过用户名查找用户时发生错误，用户名：${username}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}



// 更新用户用户名和密码
/* async function updateUser(_id, user) {
  console.log('Updating user with ID:', _id, 'to:', user);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET username = ?, password_hash = ?, updatedAt = NOW() WHERE _id = ?',
    [user.username, user.password_hash, _id]
  );
  console.log('User updated:', _id);
} */
async function updateUser(_id, user) {
  let connection;
  try {
    console.log(`开始更新用户信息，ID：${_id}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET username = ?, password_hash = ?, updatedAt = NOW() WHERE _id = ?',
      [user.username, user.password_hash, _id]
    );
    console.log(`用户信息更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户信息时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* // 更新用户会员等级
async function updateUserMembershipLevel(id, membershipLevel) {
  console.log('Updating user membership level for ID:', id, 'to:', membershipLevel);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET membershipLevel = ?, updatedAt = NOW() WHERE _id = ?',
    [membershipLevel, id]
  );
  console.log('User membership level updated:', id);
}
 */
async function updateUserMembershipLevel(_id, membershipLevel) {
  let connection;
  try {
    console.log(`开始更新用户会员等级，ID：${_id}，新等级：${membershipLevel}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET membershipLevel = ?, updatedAt = NOW() WHERE _id = ?',
      [membershipLevel, _id]
    );
    console.log(`用户会员等级更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户会员等级时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}



// 更新用户新访问钥匙
/* async function updateRefreshToken(_id, refreshToken) {
  console.log('Updating refresh token for user ID:', _id, 'to:', refreshToken);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET refreshToken = ?, updatedAt = NOW() WHERE _id = ?',
    [refreshToken, _id]
  );
  console.log('Refresh token updated:', _id);
} */

async function updateRefreshToken(_id, refreshToken) {
  let connection;
  try {
    console.log(`开始更新用户刷新令牌，ID为：${_id}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query('START TRANSACTION');  // 显式开始事务

    await connection.query(
      'UPDATE users SET refreshToken = ?, updatedAt = NOW() WHERE _id = ?',
      [refreshToken, _id]
    );
    console.log(`用户刷新令牌更新成功，ID为：${_id}`);

    await connection.query('COMMIT');  // 提交事务
  } catch (error) {
    if (connection) {
      await connection.query('ROLLBACK');  // 回滚事务
    }
    console.error(`更新用户刷新令牌时发生错误，ID为：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
// 更新用户头像
/* async function updateAvatard(_id, avatarId) {
  console.log('Updating avatar for user ID:', _id, 'to:', avatarId);
  const connection = await getConnection();
  console.log('Updating avatar for user ID:', _id, 'with avatar ID:', avatarId);
  await connection.query(
    'UPDATE users SET avatar_id = ?, updatedAt = NOW() WHERE _id = ?',
    [avatarId, _id]
  );
} */
async function updateAvatard(_id, avatarId) {
  let connection;
  try {
    console.log(`开始更新用户头像，ID：${_id}，新头像ID：${avatarId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET avatar_id = ?, updatedAt = NOW() WHERE _id = ?',
      [avatarId, _id]
    );
    console.log(`用户头像更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户头像时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}


// 更新用户余额
/* async function updateUserBalance(_id, amount) {
  console.log('Updating balance for user ID:', _id, 'by:', amount);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET balance = balance + ? WHERE _id = ?',
    [amount, _id]
  );
  console.log('Balance updated:', _id);
} */
async function updateUserBalance(_id, amount) {
  let connection;
  try {
    console.log(`开始更新用户余额，ID：${_id}，变动金额：${amount}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET balance = balance + ? WHERE _id = ?',
      [amount, _id]
    );
    console.log(`用户余额更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户余额时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
// 更新用户积分
/* async function updateUseravailableScore(_id, amount) {
  console.log('Updating available score for user ID:', _id, 'by:', amount);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET useravailableScore = useravailableScore + ? WHERE _id = ?',
    [amount, _id]
  );
  console.log('Available score updated:', _id);
}
 */
async function updateUseravailableScore(_id, amount) {
  let connection;
  try {
    console.log(`开始更新用户积分，ID：${_id}，变动积分：${amount}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET useravailableScore = useravailableScore + ? WHERE _id = ?',
      [amount, _id]
    );
    console.log(`用户积分更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户积分时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
// 每月刷新积分
/* async function updateUseravailableScoreByLevel(level, amount) {
  console.log('Updating available score for users with level:', level, 'by:', amount);
  const connection = await getConnection();

  await connection.query(
    'UPDATE users SET useravailableScore = useravailableScore + ? WHERE membershipLevel = ?',
    [amount, level]
  );
  console.log('Available score updated for level:', level);
}
 */
async function updateUseravailableScoreByLevel(level, amount) {
  let connection;
  try {
    console.log(`开始更新会员等级为 ${level} 的用户积分，变动积分：${amount}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET useravailableScore = useravailableScore + ? WHERE membershipLevel = ?',
      [amount, level]
    );
    console.log(`会员等级为 ${level} 的用户积分更新成功`);

  } catch (error) {
    console.error(`更新会员等级为 ${level} 的用户积分时发生错误`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

/* async function updateResetPasswordToken(userId, token) {
  console.log('Updating reset password token for user ID:', userId, 'to:', token);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET resetPasswordToken = ? WHERE _id = ?',
    [token, userId]
  );
  console.log('Reset password token updated:', userId);
} */
async function updateResetPasswordToken(_id, token) {
  let connection;
  try {
    console.log(`开始更新用户重置密码令牌，ID：${userId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET resetPasswordToken = ? WHERE _id = ?',
      [token, _id]
    );
    console.log(`用户重置密码令牌更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户重置密码令牌时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* async function updateUserLastLoginTime(_id) {
  console.log('Updating last login time for user ID:', _id);
  const connection = await getConnection();
  await connection.query(
    'UPDATE users SET firstlogin_time = NOW() WHERE _id = ?',
    [_id]
  );
  console.log('Last login time updated:', _id);
}  */

async function updateUserLastLoginTime(_id) {
  let connection;
  try {
    console.log(`开始更新用户最后登录时间，ID：${_id}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET firstlogin_time = NOW() WHERE _id = ?',
      [_id]
    );
    console.log(`用户最后登录时间更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户最后登录时间时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

async function findUserByResetToken(token) {
  let connection;
  try {
    console.log(`开始通过重置令牌查找用户，令牌：${token}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query(
      'SELECT * FROM users WHERE resetPasswordToken = ?',
      [token]
    );
    console.log(`查询结果：`, results[0]);

    return results[0] || null; // 提前返回
  } catch (error) {
    console.error(`通过重置令牌查找用户时发生错误，令牌：${token}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

async function updateUserPassword(_id, newPassword) {
  let connection;
  try {
    console.log(`开始更新用户密码，ID：${_id}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE users SET password_hash = ? WHERE _id = ?',
      [newPassword, _id]
    );
    console.log(`用户密码更新成功，ID：${_id}`);

  } catch (error) {
    console.error(`更新用户密码时发生错误，ID：${_id}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}







module.exports = {
  createUser,
  createGoogleUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  updateUser,
  updateRefreshToken,
  updateAvatard,
  updateUserBalance,
  updateUseravailableScore,
  updateUseravailableScoreByLevel,
  updateResetPasswordToken,
  findUserByResetToken,
  updateUserPassword,  
  updateUserMembershipLevel,
  updateUserLastLoginTime 
};