require('dotenv').config();
//AI KEY 获取位置：https://docs.kie.ai/zh-CN/4o-image-api/get-4-o-image-download-url
const envConfig = {
  PORT: process.env.PORT || 3000,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || 'Hongyu_1022',
  DB_NAME: process.env.DB_NAME || 'image_processing_db',
  JWT_SECRET: process.env.JWT_SECRET || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'your_google_client_id',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || '7d',
  TRUST_PROXY_LEVEL: process.env.TRUST_PROXY_LEVEL || 1,
  DEFAULT_AVATAR_ID: process.env.DEFAULT_AVATAR_ID || '123e4567e89b42d3a45855464840f9b6',
  OSS_REGION: process.env.OSS_REGION || 'oss-cn-shanghai',
  OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID || 'LTAI5tJT3agWG2dFTgXDy7rp',
  OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET || 'jOR2A3fSooItwixpyW6Qh509h53Koa',
  OSS_BUCKET: process.env.OSS_BUCKET || 'xinsulv-temp-shanghai',
  KIEAI_API_URL: process.env.KIEAI_API_URL || 'https://kieai.erweima.ai/api/v1',
  KIEAI_AUTH_TOKEN: process.env.KIEAI_AUTH_TOKEN  || '27e443bd81969aefddc051bd78fa0a01',
  GOOGLE_CLIENT_ID: process.env.GOOGLEGOOGLE_CLIENT_ID || 'lhy65085',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'lhy6508sss5',
  SESSION_SECRET: process.env.SESSION_SECRET || 'd8f1ea4b0e69a8c3e6d9f1b4d8f1ea4b0e69a8c3e6d9f1b4d8f1ea4b0e69a8c3e6d9f1b4d8f1ea4b0e69a8c3e6d9f1b4',
  CREDIT_FOR_FREEUSR: process.env.CREDIT_FOR_FREEUSR || 30,
  CREDIT_FOR_LTUSR: process.env.CREDIT_FOR_LTUSR || 300,
  CREDIT_FOR_PROUSR: process.env.CREDIT_FOR_PROUSR || 600,
  CREDIT_DEFAULT: process.env.CREDIT_DEFAULT || 40,
  USR_DEFAULT_AVATAR: process.env.USR_DEFAULT_AVATAR || 'https://xinsulv-temp-shanghai.oss-cn-shanghai.aliyuncs.com/colorbook/avatar/default.png'
};

module.exports = envConfig;

