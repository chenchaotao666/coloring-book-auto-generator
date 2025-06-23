const { getConnection } = require('../config/db.config');

async function createReport(report) {
  let connection;
  try {
    console.log(`开始创建报告：`, report);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'INSERT INTO image_reports (image_id, user_id, content, report_type) VALUES (?, ?, ?, ?)',
      [report.image_id, report.user_id, report.content, report.report_type]
    );
    console.log(`报告创建成功，图片ID：${report.image_id}，用户ID：${report.user_id}`);
  } catch (error) {
    console.error(`创建报告时发生错误：`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
async function checkReportExists(imageId, userId) {
  let connection;
  try {
    console.log(`检查报告是否存在：图片ID ${imageId}，用户ID ${userId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query(
      'SELECT * FROM image_reports WHERE image_id = ? AND user_id = ?',
      [imageId, userId]
    );
    console.log(`查询结果：`, results);

    return results.length > 0;
  } catch (error) {
    console.error(`检查报告是否存在时发生错误：图片ID ${imageId}，用户ID ${userId}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}

module.exports = { createReport, checkReportExists };