const OSS = require('ali-oss');
const envConfig = require('./env.config');

const ossClient = new OSS({
  region: envConfig.OSS_REGION,
  accessKeyId: envConfig.OSS_ACCESS_KEY_ID,
  accessKeySecret: envConfig.OSS_ACCESS_KEY_SECRET,
  bucket: envConfig.OSS_BUCKET
});

module.exports = { ossClient };