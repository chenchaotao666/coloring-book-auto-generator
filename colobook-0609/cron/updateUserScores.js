// cron/updateUserScores.js
const cron = require('node-cron');

const envConfig = require('../config/env.config');



// 每月 1 号零点执行
cron.schedule('0 0 1 * *', async () => {
  try {
    // 更新 free 会员等级的用户
    await updateUseravailableScoreByLevel('free', envConfig.CREDIT_FOR_FREEUSR);

    // 更新 lite 会员等级的用户
    await updateUseravailableScoreByLevel('lite', envConfig.CREDIT_FOR_LTUSR);

    // 更新 pro 会员等级的用户
    await updateUseravailableScoreByLevel('pro', envConfig.CREDIT_FOR_PROUSR);

    console.log('用户积分更新成功');
  } catch (error) {
    console.error('用户积分更新失败:', error);
  }
});
