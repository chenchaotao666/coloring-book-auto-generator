const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');




/* ### 🔐 认证相关
| 方法 | 接口地址 | 描述 | 认证 |
|------|----------|------|------|
| GET | `/api/users/refresh-token` | 刷新访问令牌 | ✅ |

### 👥 用户管理
| 方法 | 接口地址 | 描述 | 认证 |
|------|----------|------|------|
| POST | `/api/auth/register` | 用户注册 | ✅ |
| POST | `/api/auth/login` | 用户登录 | ✅ |
| POST | `/api/auth/logout`| 用户注销 | ✅ |
 */






// 用户注册
router.post('/register', (req, res, next) => {
  console.log('接收到注册请求');
  next();
}, authController.register);

// 用户登录
router.post('/login', (req, res, next) => {
  console.log('接收到登录请求');
  next();
}, authController.login);

// 谷歌登录
router.post('/google', (req, res, next) => {
  console.log('接收到谷歌登录请求');
  next();
}, authController.googleLogin);

// 刷新令牌
router.post('/refresh-token', (req, res, next) => {
  console.log('接收到刷新令牌请求');
  next();
}, authController.refreshToken);

// 用户注销
router.post('/logout', (req, res, next) => {
  console.log('接收到注销请求');
  next();
}, authController.logout);


router.get('/google', authController.googleLogin);

router.get('/google/callback', authController.googleLoginCallback);

router.get('/googlelogout', authController.googleLogout);


module.exports = router;