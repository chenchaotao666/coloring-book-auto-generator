
const { createImageExt } = require('../models/image.model');


async function importImages(imagesData) {
  for (const imageData of imagesData) {


    // 转换 additionalInfo 为 JSON 格式
    if (imageData.additionalInfo) {
      try {
        imageData.additionalInfo = JSON.parse(imageData.additionalInfo);
      } catch (error) {
        // 如果 additionalInfo 不是有效的 JSON，将其转换为对象
        imageData.additionalInfo = {};
      }
    }

    // 插入数据到数据库，必须保证tags 是字符串形式“老虎，狮子，大象”等等
    await createImageExt(imageData,imageData.tags);
  }
}

module.exports = {
  importImages,
};