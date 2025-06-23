const { createReport, checkReportExists } = require('../models/report.model');
const { findImageById } = require('../models/image.model');

async function handleReportImage(userId, reportData) {
  const { content, imageId } = reportData;

  // 检查图片是否存在
  const image = await findImageById(imageId);
  if (!image) {
    throw { status: 'fail', errorCode: '2001', message: '指定的图片不存在' };
  }

  // 检查举报内容是否为空
  if (!content || content.trim().length === 0) {
    throw { status: 'fail', errorCode: '4001', message: '举报内容不能为空' };
  }

  // 检查用户是否已经举报过该图片
  const reportExists = await checkReportExists(imageId, userId);
  if (reportExists) {
    throw { status: 'fail', errorCode: '4002', message: '您已经举报过该图片' };
  }

  // 创建举报记录
  await createReport({
    image_id: imageId,
    user_id: userId, // 确保 user_id 是 INT 类型
    content,
    report_type: '不当内容' // 默认举报类型为“不当内容”
  });
}

module.exports = { handleReportImage };