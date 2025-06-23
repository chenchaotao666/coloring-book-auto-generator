const { registerUser, loginUser, appleLogin, refresh_Token, logout } = require('../services/auth.service');
const { googleLogin, googleLoginCallback, googleLogouts } = require('../services/auth.service');
const { createSendToken } = require('../services/auth.service');



exports.register = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await registerUser(userData);
     
    await createSendToken(user, 201, res, { responseType: 'register' });
    //res.status(201).json({ status: 'success', data: user });
  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      next(error);
    }
  }
};



exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await loginUser(email, password);

    await createSendToken(user, 201, res, { responseType: 'login' });


  } catch (error) {
    if (error.status === 'fail') {
      res.status(400).json(error);
    } else {
      next(error); // 将未处理的错误传递给全局错误处理中间件
    }
  }
};


exports.appleLogin = async (req, res) => {
  try {
    const user = await appleLogin(req.body.token);
    createSendToken(user, 200, res, { responseType: 'appleLogin' });
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: error.message
    });
  }
};





exports.googleLoginext = async (req, res) => {
  try {
    createSendToken(user, 200, res, { responseType: 'googleLogin' });       

  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: error.message
    });
  }
};


exports.googleLogin = (req, res, next) => {
  googleLogin(req, res, next);
};

exports.googleLoginCallback = (req, res, next) => {
  googleLoginCallback(req, res, next);
};

exports.googleLogout = (req, res) => {
  googleLogouts(req, res);
};






exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await refresh_Token(refreshToken);
    await createSendToken(user, 200, res, { responseType: 'refreshToken' });
  } catch (err) {
    res.status(401).json({ status: 'fail', message: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    // 打印请求开始的日志
    console.log('注销请求开始', { headers: req.headers });

    // 从请求头中提取令牌
    const token = req.headers.authorization?.split(' ')[1];
    console.log('从请求头中提取的令牌', { token });

    // 检查是否提取到令牌
    if (!token) {
      console.error('未提供有效的令牌');
      return res.status(400).json({ status: 'error', message: '未提供有效的令牌' });
    }

    // 调用 logout 函数处理注销逻辑
    await logout(token);
    console.log('注销逻辑执行成功');

    // 返回成功响应
    res.status(200).json({ status: 'success', message: '成功注销' });
  } catch (err) {
    // 打印错误日志
    console.error('注销请求失败', { error: err });

    // 返回失败响应
    res.status(500).json({ status: 'error', message: '注销失败' });
  }
};