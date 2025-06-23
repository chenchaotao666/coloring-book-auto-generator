// middleware/activityTracker.js
const activityTracker = (req, res, next) => {
    // 从请求中提取用户ID和任务类型
    const userId = req.user._id;
    const taskType = req.body.taskType || req.query.taskType;

    // 记录任务开始
    req.app.locals.activeTasks.push({
        userId,
        taskType,
        startTime: new Date(),
        status: 'in-progress'
    });

    // 调用下一个中间件
    next();

    // 在响应完成后，更新任务状态
    res.on('finish', () => {
        const taskIndex = req.app.locals.activeTasks.findIndex(
            task => task.userId === userId && task.taskType === taskType && task.status === 'in-progress'
        );

        if (taskIndex !== -1) {
            req.app.locals.activeTasks[taskIndex].status = 'completed';
            req.app.locals.activeTasks[taskIndex].endTime = new Date();
        }
    });
};

module.exports = activityTracker;