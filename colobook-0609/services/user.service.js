const { findUserById, updateAvatard , updateUser,  updateResetPasswordToken, findUserByResetToken,updateUserPassword} = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { ossClient } = require('../config/oss.config'); // 确保路径正确
const { sendResetPasswordEmail } = require('../utils/email.utils');


async function updateAvatars(_id, file) {
  const user = await findUserById(_id);
  if (!user) {
    throw { status: 'fail', errorCode: '1010', message: '用户不存在' };
  }
  // 生成 UUID
  const avatarId = uuidv4();
  // 保存头像到 OSS
  const uploadPath = `colorbook/uploads/${avatarId}.png`;
  const result = await ossClient.put(uploadPath, file.buffer, {
    mime: file.mimetype,
    headers: {
      'x-oss-object-acl': 'public-read'
    }
  });
  // 更新数据库中的头像 ID-其实填写url更好，直接干URL ，用ID字段盛URL
  await updateAvatard(_id, result.url);

  return { avatar: result.url, updatedAt: new Date().toISOString() };
}
  




async function handleUpdateUser(_id, userData) {
  // 验证用户名长度
  if (userData.username.length < 3) {
    throw { status: 'fail', errorCode: '1001', message: '用户名至少3个字符' };
  }

  // 哈希密码
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(userData.password, saltRounds);

  const user = {
    username: userData.username,
    password_hash: passwordHash
  };

  await updateUser(_id, user);
  
  // 重新获取用户信息
  const updatedUser = await findUserById(_id);
  if (!updatedUser) {
    throw { status: 'fail', errorCode: '1010', message: '用户不存在' };
  }

  return updatedUser;
}

async function handleResetPasswordRequest(email) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw { status: 'fail', errorCode: '1007', message: '该邮箱未注册' };
  }

  const resetToken = uuidv4();
  await updateResetPasswordToken(user._id, resetToken);

  // 发送重置密码邮件,这里要写好名字----------当个遗留作业，发验证码到邮箱--
  // 发送重置密码邮件
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendResetPasswordEmail(user.email, resetUrl);
}





async function handleValidateResetToken(token) {
  const user = await findUserByResetToken(token);
  if (!user) {
    throw { status: 'fail', errorCode: '1008', message: '无效的重置令牌' };
  }
  return user;
}

async function handleSetNewPassword(token, newPassword) {
  const user = await findUserByResetToken(token);
  if (!user) {
    throw { status: 'fail', errorCode: '1008', message: '无效的重置令牌' };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updateUserPassword(user._id, passwordHash);
  await updateResetPasswordToken(user._id, null); // 清空重置令牌
}









module.exports = {
  updateAvatars,
  handleUpdateUser,
  handleResetPasswordRequest,
  handleValidateResetToken,
  handleSetNewPassword 
};