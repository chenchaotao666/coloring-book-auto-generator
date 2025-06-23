// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const importController = require('../controllers/import.controller');

// 获取当前活动任务
router.get('/activeTasks', adminController.getActiveTasks);

// 上传 JSON 数据并导入
router.post('/import', importController.importImagesFromJSON);





module.exports = router;