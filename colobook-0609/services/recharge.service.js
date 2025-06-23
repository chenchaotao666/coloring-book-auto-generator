const { createRecharge, getRechargeRecords } = require('../models/recharge.model');
const { updateUserBalance, updateUseravailableScore, updateUserMembershipLevel} = require('../models/user.model');
const { calculateRechargeAmount } = require('../utils/payment.utils');
const { findUserById} = require('../models/user.model');
/* async function handleRecharge(userId, rechargeData) {
  const { type, level, payType } = rechargeData;

  // 验证充值类型
  if (!['monthly', 'yearly',  'credits'].includes(type)) {
    throw { status: 'fail', errorCode: '1014', message: '不支持的充值类型' };
  }
  

  // 验证会员等级 ,free 是为了后面做扩展用
  if (!['lite', 'pro', 'free'].includes(level)) {
    throw { status: 'fail', errorCode: '1017', message: '无效的会员等级' };
  }

  // 验证支付方式
  if (!['master', 'visa', 'americanexpress', 'applepay', 'unionpay'].includes(payType)) {
    throw { status: 'fail', errorCode: '1015', message: '当前不支持该支付方式' };
  }

  // 计算充值金额， 这里要弹出一个框，让别人付钱？ 还是已经付完了告诉我？
  const amount = calculateRechargeAmount(type, level);
  if (amount <= 0) {
    throw { status: 'fail', errorCode: '1016', message: '充值金额必须大于0' };
  }


  // 获取用户当前会员等级, 只要充钱了，肯定就不是free，这里的目的就是改free
  const currentUser = await findUserById(userId);


  const currentLevel = currentUser.membershipLevel;

  if(level !=currentLevel)
  {
    // 如果用户当前会员等级与充值的会员等级不一致，更新用户的会员等级
    await updateUserMembershipLevel(userId, level);
  }

  // 创建充值记录
  const recharge = {
    user_id: userId,
    amount,
    status: 'pending'
  };
  const rechargeId = await createRecharge(recharge);

  // 更新用户余额
  await updateUserBalance(userId, amount);

  // 更新用户可用积分 ，这里放置一个规则，一块钱10个积分
  await updateUseravailableScore(userId, amount * 10);


  return { rechargeId, amount, type, level, payType };
}
 */

async function handleRecharge(userId, rechargeData) {
  try {
    console.log('handleRecharge function started');
    console.log('Received userId:', userId);
    console.log('Received rechargeData:', rechargeData);

    const { type, level, payType } = rechargeData;

    console.log('Validating recharge type');
    // 验证充值类型
    if (!['monthly', 'yearly', 'credits'].includes(type)) {
      console.error('Invalid recharge type');
      throw { status: 'fail', errorCode: '1014', message: '不支持的充值类型' };
    }

    console.log('Validating membership level');
    // 验证会员等级
    if (!['lite', 'pro', 'free'].includes(level)) {
      console.error('Invalid membership level');
      throw { status: 'fail', errorCode: '1017', message: '无效的会员等级' };
    }

    console.log('Validating payment type');
    // 验证支付方式
    if (!['master', 'visa', 'americanexpress', 'applepay', 'unionpay'].includes(payType)) {
      console.error('Invalid payment type');
      throw { status: 'fail', errorCode: '1015', message: '当前不支持该支付方式' };
    }

    console.log('Calculating recharge amount');
    // 计算充值金额
    const amount = calculateRechargeAmount(type, level);
    if (amount <= 0) {
      console.error('Recharge amount must be greater than 0');
      throw { status: 'fail', errorCode: '1016', message: '充值金额必须大于0' };
    }

    console.log('Fetching current user information');
    // 获取用户当前信息
    const currentUser = await findUserById(userId);
    console.log('Current user information:', currentUser);

    if (!currentUser) {
      console.error('User not found');
      throw { status: 'fail', errorCode: '1010', message: '用户不存在' };
    }

    console.log('Retrieving current membership level');
    // 获取用户当前会员等级
    const currentLevel = currentUser.membershipLevel;

    console.log('Comparing membership levels');
    // 如果用户当前会员等级与充值的会员等级不一致，更新用户的会员等级
    if (level !== currentLevel) {
      console.log(`Updating user membership level from ${currentLevel} to ${level}`);
      await updateUserMembershipLevel(userId, level);
      console.log('User membership level updated successfully');
    }

    console.log('Creating recharge record');
    // 创建充值记录
    const recharge = {
      user_id: userId,
      amount,
      status: 'pending'
    };
    const rechargeId = await createRecharge(recharge);
    console.log('Recharge record created with ID:', rechargeId);

    console.log('Updating user balance');
    // 更新用户余额
    await updateUserBalance(userId, amount);
    console.log('User balance updated successfully');

    console.log('Updating user available score');
    // 更新用户可用积分
    await updateUseravailableScore(userId, amount * 10);
    console.log('User available score updated successfully');

    console.log('handleRecharge function completed successfully');
    return { rechargeId, amount, type, level, payType };
  } catch (error) {
    console.error('Error in handleRecharge function:', error);
    throw error;
  }
}
async function prepareRechargeResponse(user, rechargeDetails) {
  // 组装 data 部分
  const data = {
    order: {
      orderId: rechargeDetails.rechargeId,
      amount: rechargeDetails.amount,
      currency: 'USD',
      type: rechargeDetails.type,
      level: rechargeDetails.level,
      payType: rechargeDetails.payType,
      status: 'OK',
      createdAt: new Date().toISOString()
    }
  };

  // 从数据库中获取最新的用户信息
  const currentUser = await findUserById(user._id);

  // 组装 user 部分， 主要是刷新积分
  const userResponse = {
    id: currentUser._id,
    username: currentUser.username,
    email: currentUser.email,
    avatar: currentUser.avatar_id,
    credits: currentUser.useravailableScore,
    userType: currentUser.role,
    membershipExpiry: currentUser.membershipExpiry,
    updatedAt: new Date().toISOString()
  };

  // 合并 data 和 user 为一个结果
  const response = {
    status: 'success',
    data: data,
    user: userResponse
  };

  return response;
}




async function handleGetRechargeRecords(userId) {
  return await getRechargeRecords(userId);
}

module.exports = { handleRecharge, prepareRechargeResponse, handleGetRechargeRecords };