const { handleRecharge,prepareRechargeResponse, handleGetRechargeRecords } = require('../services/recharge.service');


/* ### 5. 用户充值
**接口地址:** `POST /api/users/recharge`
**接口描述:** 用户账户充值
**请求体参数:**

| 参数      | 类型     | 必填  | 说明   | 限制                                            |
| ------- | ------ | --- | ---- | --------------------------------------------- |
| type    | string | 是   | 充值类型 | monthly/yearly/credits                        |
| level   | string | 是   | 会员等级 | lite/pro                                      |
| credits | string | 否   | 积分数量 | 当前不需要                                         |
| payType | string | 是   | 支付方式 | master/visa/americanexpress/applepay/unionpay | 
*/


exports.recharge = async (req, res, next) => {
  try {
     const _id = req.user._id;
 
    const rechargeData = req.body;

    const rechargeDetails = await handleRecharge(_id, rechargeData);

    // 使用服务文件中的函数来准备响应数据
    const response = await prepareRechargeResponse(req.user, rechargeDetails);

    res.status(200).json(response);
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      next(error);
    }
  }
};

exports.getRechargeRecords = async (req, res, next) => {
  try {
   const _id = req.user._id;; // 从JWT Token中获取用户ID

    const records = await handleGetRechargeRecords(_id);

    res.status(200).json({
      status: 'success',
      data: records
    });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      next(error);
    }
  }
};