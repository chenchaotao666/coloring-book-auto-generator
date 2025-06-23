const express = require('express');
const router = express.Router();
const rechargeController = require('../controllers/recharge.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/recharge', authMiddleware, rechargeController.recharge);
router.get('/recharge-records', authMiddleware, rechargeController.getRechargeRecords);

module.exports = router;