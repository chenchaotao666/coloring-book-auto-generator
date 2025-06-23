const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');



/* ### 👥 用户管理
| 方法 | 接口地址 | 描述 | 认证 |
|------|----------|------|------|
| PUT | `/api/users/update` | 修改用户信息 | ✅ |
| POST | `/api/users/avatar` | 上传用户头像 | ✅ |
| POST | `/api/users/profile` | 获取用户信息 | ❌ | */


// 获取用户信息
router.get('/profile', authMiddleware, userController.getUserProfile);

// 更新用户信息，包括密码和用户名字
router.put('/update', authMiddleware, userController.updateUserProfile);

// 用户头像上传
router.post( '/avatar',  authMiddleware,  upload.any(),   userController.updateAvatar);




//forgotPassword 其实就是下面的resetPasswordRequest, 为了兼容上面，改成forgotPassword作为接口
router.post('/forgot-password', userController.resetPasswordRequest);

/**
   * 验证重置密码token，只有这个保持不变
   */
router.get('/validate-reset-token/:token', userController.validateResetToken);

//reset-password 其实就是下面的setNewPassword, 为了兼容上面，改成resePassword 作为接口
router.post('/reset-password', userController.setNewPassword);




module.exports = router;