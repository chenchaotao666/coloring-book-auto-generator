const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const rechargeRoutes = require('./routes/recharge.routes');
const imageRoutes = require('./routes/image.routes');
//const authMiddleware = require('./middleware/auth.middleware'); // 导入认证中间件
//const validationMiddleware = require('./middleware/validation.middleware'); // 导入验证中间件
const envConfig = require('./config/env.config');

const adminRouter = require('./routes/admin.routes');
const passport = require('passport');
const session = require('express-session');
require('./config/passport.config'); // 初始化passport配置
require('./cron/updateUserScores');



// 创建 Express 应用
const app = express();

app.locals.activeTasks = [];

// 配置中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 加载认证中间件
//app.use(authMiddleware);

// 加载验证中间件
//app.use(validationMiddleware);


///////////////////为google 新增 begin///////////
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret:  envConfig.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

///////////////////为google 新增 end//////////


// 配置路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/recharge', rechargeRoutes);
app.use('/api/admin', adminRouter);
// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

// 启动服务器
//const PORT = envConfig.PORT;
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});