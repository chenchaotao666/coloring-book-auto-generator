const { findUserById } = require('../models/user.model');
const { updateAvatars, handleUpdateUser, handleResetPasswordRequest , handleValidateResetToken, handleSetNewPassword } = require('../services/user.service');


/* exports.getUserProfile = async (req, res) => {
  try {
    // 修复点：直接获取用户ID
    const _id = req.user._id;
    console.log(`getUserProfile: 请求用户资料，用户ID: ${_id}`);

    const user = await findUserById(_id);
    
    if (!user) {
      return res.status(404).json({ 
        status: 'fail',
        errorCode: '1010',
        message: '用户不存在'
      });
    }

    res.status(200).json({ // 修改状态码为200
      status: 'success',
      data: {
        username: user.username,
        email: user.email,
        avatar: user.avatar_id,
        credits: user.useravailableScore,
        userType: user.role,
        membershipExpiry: user.membershipExpiry, // 修正字段名
        createdAt: user.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error(`服务器错误: ${error.message}`);
    res.status(500).json({
      status: 'fail',
      errorCode: '1011',
      message: '服务器错误'
    });
  }
}; */
exports.getUserProfile = async (req, res) => {

  console.log('getUserProfile: 开始处理请求');
  try {
    // 修复点：直接获取用户ID
    const _id = req.user._id;
    console.log(`getUserProfile: 请求用户资料，用户ID: ${_id}`);

    // 调用 findUserById 函数获取用户信息
    console.log(`getUserProfile: 开始查找用户，ID: ${_id}`);
    const user = await findUserById(_id);
    console.log(`getUserProfile: 用户查找完成，用户信息:`, user);

    // 检查用户是否存在
    if (!user) {
      console.log(`getUserProfile: 用户不存在，ID: ${_id}`);
      return res.status(404).json({ 
        status: 'fail',
        errorCode: '1010',
        message: '用户不存在'
      });
    }

    // 构造响应数据
    const userProfile = {
      username: user.username,
      email: user.email,
      avatar: user.avatar_id,
      credits: user.useravailableScore,
      userType: user.role,
      membershipExpiry: user.membershipExpiry,
      createdAt: user.createdAt.toISOString()
    };
    console.log(`getUserProfile: 准备响应用户资料，用户ID: ${_id}, 用户资料:`, userProfile);

    // 发送响应
    res.status(200).json({
      status: 'success',
      data: userProfile
    });
    console.log(`getUserProfile: 成功响应用户资料，用户ID: ${_id}`);
  } catch (error) {
    console.error(`getUserProfile: 服务器错误: ${error.message}`);
    res.status(500).json({
      status: 'fail',
      errorCode: '1011',
      message: '服务器错误'
    });
  }
};

/* 
这个函数可以同时修改用户名和 密码，所以，一次在这里搞定
| PUT | `/api/users/update` | 修改用户信息 | ✅ | */

exports.updateUserProfile= async (req, res, next) => {
  try {

      const _id = req.user._id;
      const userData = req.body;

      const updatedUser = await handleUpdateUser(_id, userData);

      res.status(200).json({
        status: 'success',
        data: {
         // id: updatedUser._id,    _id  应该藏起来，不让它回去
          username: updatedUser.username,
          email: updatedUser.email,
          avatar: updatedUser.avatar_id, // 假设 avatar_id 是用户的头像路径
          credits: updatedUser.useravailableScore, // 假设 useravailableScore 是用户的积分
          userType: updatedUser.role, // 假设 role 是用户的类型
          membershipExpiry: updatedUser.membershipLevel, // 假设 membershipLevel 是会员到期时间
          updatedAt: updatedUser.updatedAt.toISOString(), // 转换为 ISO 8601 格式
          firstlogin_time: updatedUser.firstlogin_time.toISOString() // 转换为 ISO 8601 格式
        }
      });
    } catch (error) {
      if (error.status === 'fail') {
        res.status(400).json(error);
      } else {
        next(error);
      }
    }
};



exports.validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const user = await handleValidateResetToken(token);
    res.status(200).json({ status: 'success', data: { userId: user._id } });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};

exports.resetPasswordRequest = async (req, res, next) => {
  try {
    const { email } = req.body;
    await handleResetPasswordRequest(email);
    res.status(200).json({ status: 'success', message: '重置密码邮件已发送' });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};


exports.setNewPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await handleSetNewPassword(token, newPassword);
    res.status(200).json({ status: 'success', message: '密码已成功重置' });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({ status: 'error', message: error.message });
    }
  }
};





/* exports.updateAvatar = async (req, res, next) => {
  try {
    console.log("updateAvatarctl  called with user ID:", req.user._id);
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: '请上传头像文件'
      });
    }


    
    console.log("updateAvatarctl File received:", req.file);

    const avatarDetails = await updateAvatars(req.user._id, req.file);

    res.status(200).json({
      status: 'success',
      data: {
        avatar: avatarDetails.avatar,
        updatedAt: avatarDetails.updatedAt
      }
    });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
};
 */

exports.updateAvatar = async (req, res, next) => {
  try {
    console.log("updateAvatarctl  called with user ID:", req.user._id);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: '请上传头像文件'
      });
    }

    const _id = req.user._id;
    console.log("updateAvatarctl File received:", req.files[0]);

    const avatarDetails = await updateAvatars(_id, req.files[0]);

    res.status(200).json({
      status: 'success',
      data: {
        avatar: avatarDetails.avatar,
        updatedAt: avatarDetails.updatedAt
      }
    });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      res.status(500).json({
        status: 'error',
        message: error.message
      });
    }
  }
};
