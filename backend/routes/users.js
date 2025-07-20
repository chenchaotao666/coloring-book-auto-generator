const express = require('express')
const router = express.Router()
const { executeQuery } = require('../database')

// 获取用户列表
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    // 获取用户总数
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM users')
    const total = countResult[0].total
    const totalPages = Math.ceil(total / limit)

    // 获取用户列表
    const users = await executeQuery(`
      SELECT 
        user_id,
        username,
        email,
        avatarUrl,
        useravailableScore,
        role,
        membershipLevel,
        balance,
        membershipExpiry,
        createdAt,
        updatedAt,
        firstlogin_time
      FROM users 
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset])

    res.json({
      success: true,
      users: users,
      currentPage: page,
      totalPages: totalPages,
      total: total
    })

  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户列表失败',
      error: error.message
    })
  }
})

// 获取单个用户信息
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params

    const users = await executeQuery(`
      SELECT 
        user_id,
        username,
        email,
        avatarUrl,
        useravailableScore,
        role,
        membershipLevel,
        balance,
        membershipExpiry,
        createdAt,
        updatedAt,
        firstlogin_time
      FROM users 
      WHERE user_id = ?
    `, [userId])

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    res.json({
      success: true,
      user: users[0]
    })

  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户信息失败',
      error: error.message
    })
  }
})

// 获取用户充值记录
router.get('/:userId/recharges', async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const offset = (page - 1) * limit

    console.log(`获取用户充值记录: userId=${userId}, page=${page}, limit=${limit}`)

    // 验证用户是否存在
    console.log('检查用户是否存在...')
    const userExists = await executeQuery('SELECT user_id FROM users WHERE user_id = ?', [userId])
    if (userExists.length === 0) {
      console.log('用户不存在:', userId)
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    console.log('用户存在，继续查询充值记录...')

    // 获取充值记录总数
    console.log('获取充值记录总数...')
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM recharges WHERE userId = ?', [userId])
    const total = countResult[0].total
    const totalPages = Math.ceil(total / limit)
    console.log(`充值记录总数: ${total}`)

    // 获取充值记录
    console.log('获取充值记录列表...')
    const recharges = await executeQuery(`
      SELECT 
        rechargeId,
        userId,
        orderId,
        amount,
        currency,
        status,
        method,
        planCode,
        creditsAdded,
        chargeType,
        duration,
        monthlyCredit,
        gift_month,
        createdAt,
        updatedAt
      FROM recharges 
      WHERE userId = ?
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `, [userId, limit, offset])

    console.log(`充值记录查询完成，返回${recharges.length}条记录`)

    res.json({
      success: true,
      recharges: recharges,
      currentPage: page,
      totalPages: totalPages,
      total: total
    })

  } catch (error) {
    console.error('获取充值记录失败:', error)
    res.status(500).json({
      success: false,
      message: '获取充值记录失败',
      error: error.message
    })
  }
})

// 获取用户统计信息
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params

    // 验证用户是否存在
    const userExists = await executeQuery('SELECT user_id FROM users WHERE user_id = ?', [userId])
    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 获取充值统计
    const rechargeStats = await executeQuery(`
      SELECT 
        COUNT(*) as totalRecharges,
        COALESCE(SUM(amount), 0) as totalAmount,
        COALESCE(SUM(creditsAdded), 0) as totalCredits,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successfulRecharges,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedRecharges
      FROM recharges 
      WHERE userId = ?
    `, [userId])

    // 获取最近充值记录
    const recentRecharge = await executeQuery(`
      SELECT createdAt, amount, status
      FROM recharges 
      WHERE userId = ? AND status = 'success'
      ORDER BY createdAt DESC 
      LIMIT 1
    `, [userId])

    res.json({
      success: true,
      stats: {
        ...rechargeStats[0],
        lastRechargeAt: recentRecharge.length > 0 ? recentRecharge[0].createdAt : null,
        lastRechargeAmount: recentRecharge.length > 0 ? recentRecharge[0].amount : null
      }
    })

  } catch (error) {
    console.error('获取用户统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户统计失败',
      error: error.message
    })
  }
})

// 更新用户信息（管理员功能）
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const {
      username,
      email,
      role,
      membershipLevel,
      useravailableScore,
      balance,
      membershipExpiry
    } = req.body

    // 验证用户是否存在
    const userExists = await executeQuery('SELECT user_id FROM users WHERE user_id = ?', [userId])
    if (userExists.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 构建更新字段
    const updateFields = []
    const params = []

    if (username !== undefined) {
      updateFields.push('username = ?')
      params.push(username)
    }
    if (email !== undefined) {
      updateFields.push('email = ?')
      params.push(email)
    }
    if (role !== undefined) {
      updateFields.push('role = ?')
      params.push(role)
    }
    if (membershipLevel !== undefined) {
      updateFields.push('membershipLevel = ?')
      params.push(membershipLevel)
    }
    if (useravailableScore !== undefined) {
      updateFields.push('useravailableScore = ?')
      params.push(useravailableScore)
    }
    if (balance !== undefined) {
      updateFields.push('balance = ?')
      params.push(balance)
    }
    if (membershipExpiry !== undefined) {
      updateFields.push('membershipExpiry = ?')
      params.push(membershipExpiry)
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有提供要更新的字段'
      })
    }

    // 添加更新时间
    updateFields.push('updatedAt = NOW()')
    params.push(userId)

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`
    await executeQuery(sql, params)

    // 返回更新后的用户信息
    const updatedUser = await executeQuery(`
      SELECT 
        user_id,
        username,
        email,
        avatarUrl,
        useravailableScore,
        role,
        membershipLevel,
        balance,
        membershipExpiry,
        createdAt,
        updatedAt,
        firstlogin_time
      FROM users 
      WHERE user_id = ?
    `, [userId])

    res.json({
      success: true,
      message: '用户信息更新成功',
      user: updatedUser[0]
    })

  } catch (error) {
    console.error('更新用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '更新用户信息失败',
      error: error.message
    })
  }
})

// 获取系统用户统计
router.get('/system/stats', async (req, res) => {
  try {
    // 用户总数
    const totalUsersResult = await executeQuery('SELECT COUNT(*) as total FROM users')
    const totalUsers = totalUsersResult[0].total

    // 今日新注册用户
    const todayUsersResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE DATE(createdAt) = CURDATE()
    `)
    const todayUsers = todayUsersResult[0].total

    // 会员用户数
    const memberUsersResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE membershipLevel IS NOT NULL 
        AND membershipLevel != 'basic' 
        AND (membershipExpiry IS NULL OR membershipExpiry > NOW())
    `)
    const memberUsers = memberUsersResult[0].total

    // 活跃用户数（最近30天有登录）
    const activeUsersResult = await executeQuery(`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE updatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `)
    const activeUsers = activeUsersResult[0].total

    // 充值统计
    const rechargeStatsResult = await executeQuery(`
      SELECT 
        COUNT(*) as totalRecharges,
        COALESCE(SUM(amount), 0) as totalAmount,
        COUNT(DISTINCT userId) as uniqueUsers
      FROM recharges 
      WHERE status = 'success'
    `)
    const rechargeStats = rechargeStatsResult[0]

    // 今日充值
    const todayRechargeResult = await executeQuery(`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM recharges 
      WHERE status = 'success' AND DATE(createdAt) = CURDATE()
    `)
    const todayRecharge = todayRechargeResult[0]

    res.json({
      success: true,
      stats: {
        totalUsers,
        todayUsers,
        memberUsers,
        activeUsers,
        totalRecharges: rechargeStats.totalRecharges,
        totalRechargeAmount: rechargeStats.totalAmount,
        uniquePayingUsers: rechargeStats.uniqueUsers,
        todayRecharges: todayRecharge.count,
        todayRechargeAmount: todayRecharge.amount
      }
    })

  } catch (error) {
    console.error('获取系统统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取系统统计失败',
      error: error.message
    })
  }
})

module.exports = router