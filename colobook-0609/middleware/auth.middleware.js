const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/user.model');
const envConfig = require('../config/env.config');
const authMiddleware = async (req, res, next) => {
  try {    
    console.log('authMiddleware called');
    const token = req.headers.authorization.split(' ')[1];
    console.log('Token received:', token);
    const decoded = jwt.verify(token, envConfig.JWT_SECRET);
    console.log('Decoded token:', decoded);
    console.log('User ID from token:', decoded.id);
    req.user = await findUserById(decoded.id);
    console.log('User found:', req.user);
    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: '未授权'
    });
  }
};

module.exports = authMiddleware;