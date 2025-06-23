const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createUser, updateRefreshToken,findUserById, findUserByEmail, findUserByUsername ,updateUserLastLoginTime } = require('../models/user.model');
const envConfig = require('../config/env.config');
const promisify = require('util').promisify;
const passport = require('passport');
// 生成访问令牌
function signAccessToken(id) {
  console.log('Generating access token for user ID:', id);
  return jwt.sign({ id }, envConfig.JWT_SECRET, { expiresIn: envConfig.JWT_EXPIRES_IN });
}


// 生成刷新令牌
function signRefreshToken(id) {
  console.log('Generating refresh token for user ID:', id);
  return jwt.sign({ id }, envConfig.JWT_SECRET, { expiresIn: envConfig.REFRESH_TOKEN_EXPIRES });
}


async function registerUser(userData) {
  console.log('Starting user registration process:', userData);
  try {
    // 哈希密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // 创建用户
    // 验证邮箱格式
    if (!/^\S+@\S+\.\S+$/.test(userData.email)) {
      console.error('Invalid email format:', userData.email);
      throw { status: 'fail', errorCode: '1003', message: '邮箱格式不正确' };
    }

    // 验证密码格式
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/.test(userData.password)) {
      console.error('Invalid password format:', userData.password);
      throw { status: 'fail', errorCode: '1004', message: '密码必须包含字母和数字，长度6-50字符' };
    }

    // 验证用户名长度
    if (userData.username.length < 3) {
      console.error('Username too short:', userData.username);
      throw { status: 'fail', errorCode: '1001', message: '用户名至少3个字符' };
    }

    // 检查邮箱是否已被注册
    const existingUserByEmail = await findUserByEmail(userData.email);
    if (existingUserByEmail) {
      console.error('Email already registered:', userData.email);
      throw { status: 'fail', errorCode: '1006', message: '该邮箱已被注册' };
    }

    // 检查用户名是否已被使用
    const existingUserByUsername = await findUserByUsername(userData.username);
    if (existingUserByUsername) {
      console.error('Username already in use:', userData.username);
      throw { status: 'fail', errorCode: '1005', message: '该用户名已被使用' };
    }

    // 创建用户，注意，这里不应该传递id，但是没有id acces token 怎么得到呢？
    const user = {
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
    };

    const userId = await createUser(user);
    console.log('User created successfully with ID:', userId);
    return { ...user, _id: userId };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
}

async function loginUser(email, password) {
  console.log('Starting login process for email:', email);
  try {
    // 验证邮箱格式
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.error('Invalid email format:', email);
      throw { status: 'fail', errorCode: '1003', message: '邮箱格式不正确' };
    }

    // 验证邮箱和密码是否为空
    if (!email || !password) {
      console.error('Email or password is empty:', email);
      throw { status: 'fail', errorCode: '1001', message: '邮箱和密码不能为空' };
    }

    // 通过Email找到用户
    const user = await findUserByEmail(email);
    if (!user) {
      console.error('User not found for email:', email);
      throw { status: 'fail', errorCode: '1007', message: '该邮箱未注册' };
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.error('Password is incorrect for email:', email);
      throw { status: 'fail', errorCode: '1008', message: '密码错误' };
    }

    // 检查账户是否被禁用
    if (user.role === 'disabled') {
      console.error('Account is disabled for email:', email);
      throw { status: 'fail', errorCode: '1009', message: '账户已被禁用，请联系客服' };
    }

    // 生成 JWT 令牌
    const accessToken = signAccessToken(user._id);
    console.log('Access token generated for user ID:', user._id);

    return { ...user, accessToken };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

async function appleLogin(token) {
  console.log('Starting Apple login process with token:', token);
  try {
    // 这里需要实现苹果 OAuth 2.0 验证
    // 简化处理，实际开发中需要验证苹果返回的 ID 令牌
    const user = await findUserByEmail('apple_user@example.com'); // 示例邮箱
    if (!user) {
      console.error('Apple user not found');
      throw new Error('Apple 用户不存在');
    }

    // 生成 JWT 令牌
    const appleToken = signAccessToken(user._id);
    console.log('Apple token generated for user ID:', user._id);
    return { ...user, appleToken };
  } catch (error) {
    console.error('Apple login failed:', error);
    throw error;
  }
}

async function googleLogin(req, res, next) {
  console.log('Starting Google login process');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
}

async function googleLoginCallback(req, res, next) {
  console.log('Starting Google login callback process');
  passport.authenticate('google', { failureRedirect: '/login' }, async (err, user) => {
    if (err) return next(err);
    if (!user) return res.redirect('/login');
    req.logIn(user, async (err) => {
      if (err) return next(err);
      const token = jwt.sign({ id: user.id, email: user.email }, envConfig.JWT_SECRET, { expiresIn: '1h' });
      console.log('Google login successful, redirecting to login success page');
      res.redirect(`http://localhost:3000/login-success?token=${token}`);
    })(req, res, next);
  })(req, res, next);
}

async function googleLogouts(req, res) {
  console.log('Starting Google logout process');
  req.logout();
  console.log('User logged out');
  res.redirect('/');
}



// 增强刷新令牌验证
async function refresh_Token(refreshToken) {
  console.log('Starting refresh token process with token:', refreshToken);
  try {
    // 1. 基础格式验证

 /*    if (!refreshToken?.startsWith('Bearer ')) {
      console.error('Invalid token format');
         throw new Error('令牌格式错误');
    } */

    // 2. 解码验证

    //const tokenWithoutBearer = refreshToken.replace('Bearer ', '');
    const tokenWithoutBearer = refreshToken;

    console.log('Token without Bearer prefix:', tokenWithoutBearer);
    const decoded = await promisify(jwt.verify)(tokenWithoutBearer, envConfig.JWT_SECRET);


    // 3. 数据库二次验证
 
    const user = await findUserById(decoded.id); // 直接获取用户信息


    if (!user) {
      console.error('User not found for ID:', decoded.id);
      throw new Error('令牌已失效');
    }
    console.log('User found, verifying refresh token consistency', {
      tokenWithoutBearer,
      userRefreshToken: user.refreshToken
    });

    if (tokenWithoutBearer !== user.refreshToken) {
      console.error('Refresh token mismatch');
      throw new Error('令牌已失效');
    }

    console.log('Refresh token verified successfully');
    return user;
  } catch (err) {
    console.error('Refresh token validation failed:', err);
    throw err;
  }
}


// 用户注销
async function logout(token) {
  console.log('Starting logout process with token:', token);
  try {
    console.log('注销流程开始', { token });

    // 特殊处理过期 token
    let user = null;
    if (token) {
      const tokenWithoutBearer = token.replace('Bearer ', '');
      console.log('Token without Bearer prefix:', tokenWithoutBearer);

      try {
        // 正常验证
        console.log('Attempting to verify token');
        const decoded = await promisify(jwt.verify)(tokenWithoutBearer, envConfig.JWT_SECRET);
        console.log('令牌正常验证成功', { decoded });

        user = await findUserById(decoded.id); // 直接获取用户信息
        console.log('根据用户 ID 查询用户成功', { userId: decoded.id, user });
      } catch (err) {
        console.error('令牌正常验证失败', { error: err });

        if (err.name === 'TokenExpiredError') {
          console.log('检测到过期令牌，尝试允许过期令牌注销');
          const decoded = jwt.decode(tokenWithoutBearer, { complete: true });
          console.log('解码过期令牌成功', { decoded });

          user = await findUserById(decoded?.payload?.id); // 直接获取用户信息
          console.log('根据用户 ID 查询用户成功（过期令牌）', { userId: decoded?.payload?.id, user });
        } else {
          console.error('非过期错误，无法处理', { error: err });
          throw err; // 如果不是过期错误，重新抛出异常
        }
      }
    } else {
      console.error('未提供有效的令牌');
      throw new Error('未提供有效的令牌');
    }

    if (user) {
      console.log('找到用户，准备清除刷新令牌');
      // 清除令牌
      user.refreshToken = null;
      updateRefreshToken(user._id, null); // 直接更新数据库    
      console.log('刷新令牌已清除并保存到数据库');
    } else {
      console.error('未找到用户，无法注销');
      throw new Error('未找到用户，无法注销');
    }

    console.log('注销流程完成');
    return true;
  } catch (err) {
    console.error('注销流程失败', { error: err });
    throw err;
  }
}

//增加令牌鉴定函数

function validateToken(token) {
  return new Promise((resolve) => {
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      resolve(!err); // 返回布尔值
    });
  });
}

// 创建并发送令牌（增强版）
async function createSendToken(user, statusCode, res, options = {}) {
  const { responseType = 'default' } = options;
  // 检查用户对象是否已经包含 accessToken 和 refreshToken
 
  let refreshToken ;
  let accessToken ;
  let response_data ;


  switch (responseType) {

    case 'register':
      console.log(`注册分支 - 用户ID: ${user._id}`);
      //注册的时候直接注入refreshToken 到数据库中
      refreshToken = signRefreshToken(user._id);
      await updateRefreshToken(user._id, refreshToken);
      //现场生成 accessToken
      accessToken =  signAccessToken(user._id);

      // 注册时返回简化的用户信息和令牌，另外，还返回一个access token的过期时间。
      response_data = {
        status: 'success',
        data: {
            id: user._id,
            username: user.username,
            email: user.email,
            avatar: user.avatar_id,
            credits: user.useravailableScore,
            userType: user.membershipLevel,
            membershipExpiry:user.membershipExpiry,
            createdAt:user.createdAt
        }
      };
      break;

      

    case 'login':
      console.log(`登录分支 - 用户ID: ${user._id}`);
      // 使用 await 调用 Promise 版本的 validateToken
      const isValid = await validateToken(user.refreshToken);
      if (isValid) {
        console.log("✅ 刷新令牌有效");
        refreshToken = user.refreshToken; // 使用现有令牌
      } else {
        console.log("❌ 刷新令牌无效，生成新令牌");
        refreshToken = signRefreshToken(user._id);
        await updateRefreshToken(user._id, refreshToken);
        console.log(`已更新用户 ${user._id} 的刷新令牌`);
      }
      //accessToken 就直接给个新的令牌即可
      accessToken =  signAccessToken(user._id);
      // 登录时返回用户的全部字段和令牌
      response_data = {
        status: 'success',
        data: {         
                id: user._id,
                username: user.username,
                email: user.email,
                avatar: user.avatar_id,
                credits: user.useravailableScore,
                userType: user.membershipLevel,
                membershipExpiry:user.membershipExpiry,
                createdAt:user.createdAt,
                firstlogin_time:user.firstlogin_time,
                accessToken,
                refreshToken
        }
      };
      updateUserLastLoginTime(user._id); // 更新用户最后登录时间
      break;




    case 'refreshToken':
      console.log(`刷新令牌分支 - 用户ID: ${user._id}`);

      accessToken =  signAccessToken(user._id);
      refreshToken = user.refreshToken;
      // 刷新令牌时返回新的令牌
      response_data = {
        status: 'success',
        data: {
          accessToken,
          refreshToken,
          expiresIn: envConfig.JWT_EXPIRES_IN
        }
      };
      break;



    case 'logout':
      console.log(`注销分支 - 用户ID: ${user._id}`);
      // 注销时返回成功消息
      response_data = {
        status: 'success',
        data: {
          message: '成功注销'
        }
      };
      break;




    default:
      console.log(`默认分支 - 用户ID: ${user._id}`);
      // 默认返回简化的用户信息和令牌
      response_data = {
        status: 'success',
        data: {
          user: {
            _id: user._id,
            email: user.email,
            username: user.username,
            createdAt: user.createdAt
          },

        }
      };
  }



  // 解析 response_data 为 JSON 对象
 // 直接打印 response_data
  console.log(`响应数据:`, response_data);


  res.status(statusCode).json(response_data);
}
// 导出所有函数
module.exports = {
  registerUser,
  loginUser,
  appleLogin,
  googleLogin,
  googleLoginCallback,
  googleLogouts,
  refresh_Token,
  logout,
  createSendToken,
  signAccessToken,
  signRefreshToken
};