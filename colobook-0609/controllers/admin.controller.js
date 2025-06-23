// controllers/admin.controller.js
exports.getActiveTasks = (req, res) => {
    const { activeTasks } = req.app.locals;

    // 统计当前正在执行的任务数量
    const inProgressTasks = activeTasks.filter(task => task.status === 'in-progress').length;

    res.status(200).json({
        status: 'success',
        data: {
            inProgressTasks,
            allTasks: activeTasks
        }
    });
};