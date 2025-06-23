const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');
const activityTracker = require('../middleware/activityTracker');
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');


// 查询用户的图片
/* 
### 1. 图片查询
**接口地址:** `GET /api/images/`
**接口描述:** 查询图片，支持多种筛选条件和分页
**查询参数:**

| 参数        | 类型    | 必填 | 说明                   | 默认值                 |
| ----------- | ------- | ---- | ---------------------- | ---------------------- |
| imageId     | string  | 否   | 图片ID（查询单张图片） | -                      |
| query       | string  | 否   | 搜索关键词             | -                      |
| categoryId    | string  | 否   | 分类筛选               | 大类，如漫威宇宙-                      |
| tags        | string  | 否   | 标签筛选（逗号分隔）   | -  小类，钢铁侠，蜘蛛侠                    |
| ratio       | string  | 否   | 图片比例1:1            | 1:1/3:4/4:3            |
| type        | string  | 否   | 图片类型               | text2image/image2image |
| userId      | string  | 否   | 用户ID筛选             | -                      |
| isPublic    | boolean | 否   | 是否公开               | -                      |
| currentPage | number  | 否   | 当前页码               | 1                      |
| pageSize    | number  | 否   | 每页数量               | 20                     |
| isRelated   | boolean | 否   | 是否推荐相关图片       | false                  |

**请求示例:**
```bash
# 查询单张图片
GET /api/images?imageId=cat

# 搜索图片
GET /api/images?query=cat&categoryId=animals&currentPage=1&pageSize=10

# 获取相关推荐
GET /api/images?imageId=cat&isRelated=true

# 按标签筛选
GET /api/images?tags=cute,pet&ratio=1:1&isPublic=true
``` */

//router.get('/', authMiddleware, imageController.getImages);
router.get('/', imageController.getImages);
//回调函数，用于给图像生成使用
router.post('/callback',  imageController.handleCallback);

// 生成图片
router.post('/img2imggenerate', authMiddleware, upload.any(),   imageController.img2imgGenerate);


router.post('/text2imggenerate', authMiddleware,  imageController.text2imgGenerate);

// 查询任务状态，人家传task，我给他task 就完了
router.get('/tasks', authMiddleware,  imageController.getRecordInfo);

// 获取直接下载 URL
router.post('/download-url', authMiddleware, imageController.getDownloadUrl);



/**
 * API 接口说明：多标签图片搜索接口
 *
 * 接口地址：GET /search
 *
 * 接口描述：
 * 根据指定的多个标签（tags），查询与这些标签相关的图片。支持模糊搜索，只要图片包含任何一个指定的标签即可。
 *
 * 请求方式：GET
 *
 * 请求参数：
 * tag - string，必填。标签参数，可以是单个标签或多个标签，多个标签之间用逗号分隔。例如：/search?tag=卡通,花园里,小蜜蜂
 *
 * 成功响应格式：
 * {
 *   "status": "success",
 *   "data": {
 *     "images": {
 *       "image_id_1": "defaultUrl_1",
 *       "image_id_2": "defaultUrl_2",
 *       ...
 *     }
 *   }
 * }
 *
 * 错误响应格式：
 * {
 *   "status": "error",
 *   "message": "错误描述"
 * }
 *
 * 响应字段说明：
 * status - 请求状态，success 表示成功，error 表示失败。
 * images - 包含图片信息的对象，其中键是图片的唯一标识（image_id），值是图片的默认 URL（defaultUrl）。
 * message - 当 status 为 error 时，包含错误的详细描述。
 *
 * 示例请求：
 * GET /search?tag=卡通,花园里,小蜜蜂
 *
 * 示例成功响应：
 * {
 *   "status": "success",
 *   "data": {
 *     "images": {
 *       "img-001": "url1",
 *       "img-002": "url2",
 *       "img-003": "url3"
 *     }
 *   }
 * }
 *
 * 示例错误响应：
 * {
 *   "status": "error",
 *   "message": "标签参数不能为空"
 * }
 */



// 上传图片
router.post('/upload', authMiddleware, imageController.uploadImage);


// 获取用户的所有图片
router.get('/images', authMiddleware, imageController.getImages_old);

// 获取单张图片
router.get('/images/:id', authMiddleware, imageController.getImage);

// 更新图片，这里面应该是更新图片的基本信息，甚至包括tag
router.put('/images/:id', authMiddleware, imageController.updateImage);

// 删除图片
router.delete('/images/:id', authMiddleware, imageController.deleteImage);

router.post('/report', authMiddleware, imageController.reportImage);





/**
 * API 接口说明：获取所有分类和标签信息
 *
 * 接口地址：GET /api/categories_all
 *
 * 接口描述：
 * 获取所有图片分类及其对应的标签信息，并统计每个标签在分类中的图片数量。
 * 支持根据语言参数返回不同语言的分类和标签名称。
 *
 * 请求方式：GET
 *
 * 请求参数：
 * lang - string，可选。语言参数，用于指定返回的语言，支持 'zh'（中文）和 'en'（英文）。
 *        默认值为 'zh'。
 *
 * 成功响应格式：
 * {
 *   "status": "success",
 *   "data": {
 *     "categories": [
 *       {
 *         "category_code": "分类代码",
 *         "category_alias": "分类别名",
 *         "displayName": "分类显示名称",
 *         "description": "分类描述",
 *         "tagCounts": [
 *           {
 *             "tagname": "标签别名",
 *             "displayname": "标签显示名称",
 *             "count": 标签图片数量
 *           },
 *           ...
 *         ],
 *         "thumbnailUrl": "分类缩略图URL"
 *       },
 *       ...
 *     ],
 *     "total": 分类总数
 *   }
 * }
 *
 * 错误响应格式：
 * {
 *   "status": "error",
 *   "message": "错误描述"
 * }
 *
 * 响应字段说明：
 * status - 请求状态，success 表示成功，error 表示失败。
 * categories - 分类信息数组。
 *   category_code - 分类代码。
 *   category_alias - 分类别名。
 *   displayName - 分类显示名称，根据 lang 参数返回中文或英文。
 *   description - 分类描述，根据 lang 参数返回中文或英文。
 *   tagCounts - 标签计数数组。
 *     tagname - 标签别名。
 *     displayname - 标签显示名称，根据 lang 参数返回中文或英文。
 *     count - 标签对应的图片数量。
 *   thumbnailUrl - 分类缩略图 URL。
 * total - 分类总数。
 * message - 当 status 为 error 时，包含错误的详细描述。
 *
 * 示例请求：
 * GET /api/categories_all?lang=zh
 *
 * 示例成功响应：
 * {
 *   "status": "success",
 *   "data": {
 *     "categories": [
 *       {
 *         "category_code": "id-animals",
 *         "category_alias": "animals",
 *         "displayName": "动物",
 *         "description": "聪明的动物",
 *         "tagCounts": [
 *           {
 *             "tagname": "welcome",
 *             "displayname": "欢迎",
 *             "count": 2
 *           },
 *           ...
 *         ],
 *         "thumbnailUrl": "/images-mock/animals.png"
 *       },
 *       ...
 *     ],
 *     "total": 6
 *   }
 * }
 *
 * 示例错误响应：
 * {
 *   "status": "error",
 *   "message": "数据库查询错误"
 * }
 */
//authMiddleware, 
router.get('/categories',imageController.getCategories);

module.exports = router;