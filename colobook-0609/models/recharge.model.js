const getConnection= require('../config/db.config');

async function createRecharge(recharge) {
  let connection;
  try {
    console.log(`开始创建充值记录：`, recharge);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [result] = await connection.query(
      'INSERT INTO recharges (user_id, amount, status) VALUES (?, ?, ?)',
      [recharge.user_id, recharge.amount, recharge.status]
    );
    console.log(`充值记录创建成功，用户ID：${recharge.user_id}，记录ID：${result.insertId}`);

    return result.insertId;
  } catch (error) {
    console.error(`创建充值记录时发生错误：`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

async function getRechargeRecords(userId) {
  let connection;
  try {
    console.log(`获取用户充值记录，用户ID：${userId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query(
      'SELECT * FROM recharges WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error(`获取用户充值记录时发生错误，用户ID：${userId}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

module.exports = { createRecharge, getRechargeRecords };