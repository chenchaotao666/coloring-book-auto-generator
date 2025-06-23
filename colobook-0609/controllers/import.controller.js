
const { imageService } = require('../services/import.service');
exports.importImagesFromJSON = async (req, res, next) => {
  try {
    // 检查是否有 JSON 数据
    if (!req.body || !Array.isArray(req.body)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid data format. Please provide an array of image data.',
      });
    }

    // 插入数据到数据库
    await imageService.importImages(req.body);

    res.status(200).json({
      status: 'success',
      message: 'Data imported successfully',
    });
  } catch (error) {
    next(error);
  }
};