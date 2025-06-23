const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// 验证用户注册数据
exports.validateUserRegistration = [
  body('username').isLength({ min: 3 }).withMessage('用户名至少需要3个字符'),
  body('email').isEmail().withMessage('必须输入有效的电子邮件地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少需要6个字符'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// 验证用户登录数据
exports.validateUserLogin = [
  body('email').isEmail().withMessage('必须输入有效的电子邮件地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少需要6个字符'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// 验证图片上传数据
exports.validateImageUpload = [
  body('image_name').isLength({ min: 1 }).withMessage('图片名称不能为空'),
  body('image_path').isLength({ min: 1 }).withMessage('图片路径不能为空'),
  body('image_type').isIn(['JPEG', 'PNG', 'GIF']).withMessage('图片类型必须是 JPEG、PNG 或 GIF'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// 验证用户更新数据
exports.validateUserUpdate = [
  body('username').optional().isLength({ min: 3 }).withMessage('用户名至少需要3个字符'),
  body('email').optional().isEmail().withMessage('必须输入有效的电子邮件地址'),
  body('password').optional().isLength({ min: 6 }).withMessage('密码至少需要6个字符'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];