const getConnection = require('../config/db.config');
const { v4: uuidv4 } = require('uuid');
const path = require('path');





/**
 * 图像创建功能
 * @description 企业级图像管理功能，支持完整图像信息存储和UUID生成
 * @param {Object} image 图像对象，包含user_id、image_name等详细信息
 * @returns {Promise<Object>} 返回新创建图像的完整信息
 */

async function createTagsAndAssociations(imageId, tags) {
  const connection = await getConnection();
  try {

    // 新增：切分字符串为数组（兼容字符串或数组输入）
    const tagArray = typeof tags === 'string' 
      ? tags.split('，').map(tag => tag.trim()).filter(tag => tag)
      : tags;

    // 遍历每个标签并插入到 newtags 表中（如果不存在）
    for (const tag of tagArray) {
      // 检查标签是否已存在
      const [existingTag] = await connection.query(
        'SELECT * FROM newtags WHERE tag_alias = ?',
        [tag]
      );

      let tagId;
      if (existingTag.length === 0) {
        // 如果标签不存在，插入新标签
        await connection.query(
          'INSERT INTO newtags (tag_code, tag_alias, display_name_zh, display_name_en) VALUES (?, ?, ?, ?)',
          [tag, tag, tag, tag] // 这里可以根据实际需求调整标签的其他字段
        );
        // 获取新插入标签的 ID
        const [result] = await connection.query(
          'SELECT LAST_INSERT_ID() AS id'
        );
        tagId = result[0].id;
      } else {
        // 如果标签存在，使用现有标签的 ID
        tagId = existingTag[0].tag_id;
      }

      // 插入图片与标签的关联到 new_image_tags 表中
      await connection.query(
        'INSERT INTO new_image_tags (image_id, tag_id) VALUES (?, ?)',
        [imageId, tagId]
      );
    }
  } catch (error) {
    throw error; // 捕获并抛出任何错误
  } finally {
    connection.release(); // 确保释放数据库连接
  }
}


async function createImageExt(image, tags) { // 增加 tags 参数
  const connection = await getConnection();
  const uuid = uuidv4(); // 生成唯一的 UUID

  try {
    // 插入图片信息到数据库
    await connection.query(
      'INSERT INTO images_ext (id, userId, name, defaultUrl, colorUrl, title, description, type, ratio, isPublic, prompt, categoryId, size, additionalInfo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        uuid,
        image.user_id,
        image.image_name,
        image.defaultUrl,
        image.colorUrl,
        image.title,
        image.description,
        image.type,
        image.ratio,
        image.isPublic,
        image.prompt,
        image.categoryId,
        image.size,
        image.additionalInfo
      ]
    );

    // 查询并返回新创建的图像记录的完整信息
    const [result] = await connection.query(
      'SELECT * FROM images_ext WHERE id = ?',
      [uuid]
    );

    // 调用第二个函数处理标签,这里的tags 是Json 格式的tags
    await createTagsAndAssociations(uuid, tags); // 调用第二个函数

    return result[0]; // 返回新创建的图像记录
  } catch (error) {
    throw error; // 捕获并抛出任何错误
  } finally {
    connection.release(); // 确保释放数据库连接
  }
}

/**
 * 删除图像记录 ,同时删除两步
 * @description 企业级数据管理功能，支持安全删除图像记录
 * @param {string} imageId 图像ID，用于定位要删除的记录
 */
async function deleteImage(imageId) {
  const connection = await getConnection();
  await connection.query('DELETE FROM images_ext WHERE image_id = ?', [imageId]);
  await connection.query('DELETE FROM new_image_tags WHERE image_id = ?', [imageId]);


}

/**
 * 更新图像信息，包含tag
 * @description 商业级图像管理功能，支持更新图像元数据和路径信息
 * @param {string} imageId 图像ID，用于定位要更新的记录
 * @param {Object} image 更新后的图像信息，包含image_name、image_path等字段
 */
async function updateImageByIdm(imageId, image) {
  const connection = await getConnection(); // 从连接池获取连接
  try {
    await connection.beginTransaction(); // ✅ 开启事务[6,7](@ref)

    // --- 1. 更新主图信息（在事务中执行）---
    await connection.query(
      `UPDATE images_ext 
       SET image_name=?, image_path=?, image_type=?, 
           image_metadata=?, updated_at=NOW() 
       WHERE image_id=?`,
      [
        image.image_name,
        image.image_path,
        image.image_type,
        JSON.stringify(image.image_metadata),
        imageId
      ]
    );

    // --- 2. 标签事务处理 ---
    const tags = image.tags || '';
    const newTagNames = [...new Set( // 去重
      tags.split('，').map(tag => tag.trim()).filter(tag => tag)
    )];

    // 2.1 查询当前关联标签（加锁防止并发冲突）
    const [currentTags] = await connection.query(
      `SELECT tag_id FROM new_image_tags 
       WHERE image_id=? FOR UPDATE`,
      [imageId]
    );
    const oldTagIds = currentTags.map(row => row.tag_id);

    // 2.2 无新标签时清空关联
    if (newTagNames.length === 0) {
      await connection.query(
        `DELETE FROM new_image_tags WHERE image_id=?`,
        [imageId]
      );
      await connection.commit();
      return;
    }

    // 2.3 批量查询现有标签（优化性能）
    const placeholders = newTagNames.map(() => '?').join(',');
    const [existingTags] = await connection.query(
      `SELECT tag_id, display_name_zh, display_name_en 
       FROM newtags 
       WHERE display_name_zh IN (${placeholders}) 
          OR display_name_en IN (${placeholders})`,
      [...newTagNames, ...newTagNames] // 中英文各匹配一次
    );

    // 2.4 创建缺失标签
    const existingNames = new Set([
      ...existingTags.map(t => t.display_name_zh),
      ...existingTags.map(t => t.display_name_en)
    ]);
    const missingTags = newTagNames.filter(name => 
      ![...existingNames].some(exist => exist.includes(name))
    );

    const newTagIds = [...existingTags.map(t => t.tag_id)];
    for (const tagName of missingTags) {
      const [result] = await connection.query(
        `INSERT INTO newtags (display_name_zh, display_name_en) 
         VALUES (?, ?)`,
        [tagName, tagName]
      );
      newTagIds.push(result.insertId); // 记录新标签ID
    }

    // 2.5 计算标签变更集
    const tagIdsToDelete = oldTagIds.filter(id => !newTagIds.includes(id));
    const tagIdsToAdd = newTagIds.filter(id => !oldTagIds.includes(id));

    // 2.6 执行标签关联更新
    if (tagIdsToDelete.length > 0) {
      await connection.query(
        `DELETE FROM new_image_tags 
         WHERE image_id=? AND tag_id IN (?)`,
        [imageId, tagIdsToDelete]
      );
    }
    if (tagIdsToAdd.length > 0) {
      await connection.query(
        `INSERT INTO new_image_tags (image_id, tag_id) 
         VALUES ?`,
        [tagIdsToAdd.map(tagId => [imageId, tagId])]
      );
    }

    await connection.commit(); // ✅ 提交事务[3,5](@ref)
    console.log('更新成功');
  } catch (error) {
    await connection.rollback(); // ❌ 回滚事务[6,7](@ref)
    throw new Error(`更新失败: ${error.message}`);
  } finally {
    connection.release(); // ⚠️ 确保释放连接[7](@ref)
  }
}

/**
 * 通过ID从扩展表查找图像
 * @description 企业级图像检索功能，支持从扩展表获取完整图像信息
 * @param {string} imageId 图像ID，用于精确匹配
 * @returns {Promise<Object|null>} 返回匹配的图像对象或null
 */
async function findImageById(imageId) {
    const connection = await getConnection();
    try {
        // 1. 查询图片基础信息
        const [imageResults] = await connection.query(
            `SELECT i.*, 
             COALESCE(GROUP_CONCAT(nit.tag_id SEPARATOR ','), '') AS tags
             FROM images_ext i
             LEFT JOIN new_image_tags nit ON i.image_id = nit.image_id
             WHERE i.image_id = ?
             GROUP BY i.image_id`,
            [imageId]
        );
        
        if (!imageResults[0]) return null;
        
        // 2. 单独获取标签名称（可选，根据需求决定是否保留）
        const [tagNames] = await connection.query(
            `SELECT GROUP_CONCAT(nt.display_name_zh SEPARATOR ',') AS tag_names
             FROM new_image_tags nit
             JOIN newtags nt ON nit.tag_id = nt.tag_id
             WHERE nit.image_id = ?`,
            [imageId]
        );
        
        // 3. 组合返回结果
        const result = {
            ...imageResults[0],
            tag_names: tagNames[0]?.tag_names || '' // 标签名称（可选字段）
        };
        
        return result;
    } catch (error) {
        console.error(`查询失败: ${error.message}`);
        throw error;
    } finally {
        connection.release(); // 确保释放连接
    }
}



/**
 * 按标签查找图像（带分页）- 优化版
 * @param {Object} criteria 查询条件 { tags, currentPage, pageSize }
 * @returns {Promise<Array>} 匹配的图像数组
 */
async function findImagesByTags(criteria) {
    const connection = await getConnection();
    try {
        // 1. 标签预处理
        const tagArray = criteria.tags.split('，').map(tag => tag.trim()).filter(tag => tag);
        if (tagArray.length === 0) return [];

        // 2. 并行获取标签ID（性能关键）
        const tagIdPromises = tagArray.map(tag => 
            connection.query(
                `SELECT tag_id FROM newtags 
                 WHERE display_name_zh LIKE ? OR display_name_en LIKE ?`,
                [`%${tag}%`, `%${tag}%`]
            ).then(([rows]) => rows.map(row => row.tag_id))
        );
        
        const tagIdArrays = await Promise.all(tagIdPromises);
        
        // 3. 短路优化：任一标签无匹配则直接返回
        if (tagIdArrays.some(tagIds => tagIds.length === 0)) {
            return [];
        }

        // 4. 分页ID查询（避免大偏移量）
        const pageSize = criteria.pageSize;
        const offset = (criteria.currentPage - 1) * pageSize;
        const params = [].concat(...tagIdArrays, pageSize, offset);
        
        const idQuery = `
            SELECT ie.id
            FROM images_ext ie
            ${tagIdArrays.map((_, i) => `
                AND EXISTS (
                    SELECT 1 FROM new_image_tags nit
                    WHERE nit.image_id = ie.id
                    AND nit.tag_id IN (${tagIdArrays[i].map(() => '?').join(',')})
                )
            `).join('')}
            ORDER BY ie.id
            LIMIT ? OFFSET ?
        `;
        
        const [idRows] = await connection.query(idQuery, params);
        if (idRows.length === 0) return [];

        // 5. 批量获取详情（内存排序优化）
        const imageIds = idRows.map(row => row.id);
        const [images] = await connection.query(
            `SELECT * FROM images_ext WHERE id IN (${imageIds.map(() => '?').join(',')})`,
            imageIds
        );
        
        // 保持分页顺序
        const imageMap = new Map(images.map(img => [img.id, img]));
        return idRows.map(row => imageMap.get(row.id));

    } catch (error) {
        throw new Error(`标签查询失败: ${error.message}`);
    } finally {
        connection.release();
    }
}
/**
 * 统计标签相关图像数量
 * @description 数据分析功能，快速统计特定标签下的图像总数
 * @param {Object} criteria 查询条件，主要包含tags参数
 * @returns {Promise<number>} 返回标签下图像的总数
 */
async function countImagesByTags(criteria) {
    const connection = await getConnection();
    try {
        // 1. 拆分并处理标签字符串
        const tagNames = criteria.tags.split('，')  // 按中文逗号拆分
            .map(tag => tag.trim())                // 清除空格
            .filter(tag => tag !== '');            // 过滤空值
        
        // 无有效标签时返回0
        if (tagNames.length === 0) return 0; 

        // 2. 查询标签ID（防SQL注入）
        const placeholders = tagNames.map(() => '?').join(',');
        const [tagResults] = await connection.query(
            `SELECT tag_id FROM newtags 
             WHERE display_name_zh IN (${placeholders}) 
                OR display_name_en IN (${placeholders})`,
            [...tagNames, ...tagNames]  // 中英文各匹配一次
        );
        
        // 无匹配标签时返回0
        if (tagResults.length === 0) return 0; 
        const tagIds = tagResults.map(row => row.tag_id);

        // 3. 精确统计关联图片数量
        const [countResults] = await connection.query(
            `SELECT COUNT(DISTINCT i.image_id) AS total
             FROM images_ext i
             JOIN new_image_tags nit ON i.image_id = nit.image_id
             WHERE nit.tag_id IN (?)`,
            [tagIds]
        );
        
        return countResults[0].total;
    } catch (error) {
        console.error(`统计失败: ${error.message}`);
        throw new Error('标签统计查询异常');
    } finally {
        connection.release(); // 确保释放连接
    }
}

/**
 * 复合条件图像搜索
 * @description 企业级搜索功能，支持多条件组合查询和分页控制
 * @param {Object} criteria 查询条件，包含query、categoryId、tags等多维度参数
 * @returns {Promise<Array>} 返回匹配的图像数组，按照分页规则组织
 */
async function findImagesByQuery(criteria) {
  const connection = await getConnection();
  
  try {
    // 基础查询构建
    let query = `
      SELECT DISTINCT ie.* 
      FROM images_ext ie
    `;
    let params = [];
    
    // 处理标签条件
    if (criteria.tags) {
      // 分割标签字符串并清理
      const tagArray = criteria.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      // 为每个标签构建子查询
      const tagSubQueries = tagArray.map((_, index) => `
        SELECT nit.image_id 
        FROM new_image_tags nit
        JOIN newtags nt ON nit.tag_id = nt.tag_id
        WHERE nt.display_name_zh LIKE ? OR nt.display_name_en LIKE ?
      `);
      
      // 合并所有标签子查询
      query += `
        JOIN (
          SELECT image_id 
          FROM (
            ${tagSubQueries.join(' INTERSECT ')}
          ) AS matched_images
          GROUP BY image_id
          HAVING COUNT(*) = ?
        ) AS tag_matches ON ie.id = tag_matches.image_id
      `;
      
      // 添加标签参数
      tagArray.forEach(tag => {
        params.push(`%${tag}%`, `%${tag}%`);
      });
      params.push(tagArray.length); // 确保匹配所有标签
    }
    
    // 处理分类条件
    if (criteria.category_code) {
      query += `
        JOIN categories c ON ie.categoryId = c.category_id
        WHERE c.category_code = ?
      `;
      params.push(criteria.category_code);
    } else {
      query += ` WHERE 1=1 `;
    }
    
    // 处理其他条件
    if (criteria.query) {
      query += ` AND (ie.name LIKE ? OR ie.description LIKE ?)`;
      params.push(`%${criteria.query}%`, `%${criteria.query}%`);
    }
    
    if (criteria.ratio) {
      query += ` AND ie.ratio = ?`;
      params.push(criteria.ratio);
    }
    
    if (criteria.type) {
      query += ` AND ie.type = ?`;
      params.push(criteria.type);
    }
    
    if (criteria.userId) {
      query += ` AND ie.userId = ?`;
      params.push(criteria.userId);
    }
    
    if (criteria.isPublic !== undefined) {
      query += ` AND ie.isPublic = ?`;
      params.push(criteria.isPublic);
    }
    
    // 分页处理
    query += ` LIMIT ? OFFSET ?`;
    params.push(criteria.pageSize, (criteria.currentPage - 1) * criteria.pageSize);
    
    const [results] = await connection.query(query, params);
    return results;
    
  } catch (error) {
    console.error('查询图像时出错:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 查询图像数量（支持多条件）
 * @description 数据统计功能，支持基于多条件的图像数量统计
 * @param {Object} criteria 查询条件，与findImagesByQuery函数参数一致
 * @returns {Promise<number>} 返回匹配的图像总数
 */
async function countImagesByQuery(criteria) {
  const connection = await getConnection();

  // 构建动态查询条件
  let query = `
    SELECT COUNT(*) AS total FROM images_ext
    WHERE 1=1
  `;
  let params = [];

  if (criteria.query) {
    query += ` AND (name LIKE ? OR description LIKE ?)`;
    params.push(`%${criteria.query}%`, `%${criteria.query}%`);
  }

  if (criteria.categoryId) {
    query += ` AND categoryId = ?`;
    params.push(criteria.categoryId);
  }

  if (criteria.tags) {
    query += ` AND tags LIKE ?`;
    params.push(`%${criteria.tags}%`);
  }

  if (criteria.ratio) {
    query += ` AND ratio = ?`;
    params.push(criteria.ratio);
  }

  if (criteria.type) {
    query += ` AND type = ?`;
    params.push(criteria.type);
  }

  if (criteria.userId) {
    query += ` AND userId = ?`;
    params.push(criteria.userId);
  }

  if (criteria.isPublic !== undefined) {
    query += ` AND isPublic = ?`;
    params.push(criteria.isPublic);
  }

  const [results] = await connection.query(query, params);
  return results[0].total;
}





/* 搞定categoryId    | string  | 否   | 分类筛选               | 大类，如漫威宇宙-        begin */
/**
 * 按分类ID查找图像（带分页）
 * @description 分类管理功能，支持基于分类ID的图像检索和分页控制
 * @param {Object} criteria 查询条件，包含categoryId、currentPage、pageSize等参数
 * @returns {Promise<Array>} 返回匹配的图像数组
 */
async function findImagesByCategoryId(criteria) {
  const connection = await getConnection();
  const query = `
    SELECT * FROM images_ext
    WHERE categoryId = ?
    LIMIT ? OFFSET ?
  `;
  const params = [
    criteria.categoryId,
    criteria.pageSize,
    (criteria.currentPage - 1) * criteria.pageSize
  ];
  const [results] = await connection.query(query, params);
  return results;
}
/**
 * 统计分类下图像数量
 * @description 数据分析功能，快速统计特定分类下的图像总数
 * @param {Object} criteria 查询条件，主要包含categoryId
 * @returns {Promise<number>} 返回分类下图像的总数
 */
async function countImagesByCategoryId(criteria) {
  const connection = await getConnection();
  const query = `
    SELECT COUNT(*) AS total FROM images_ext
    WHERE categoryId = ?
  `;
  const params = [criteria.categoryId];
  const [results] = await connection.query(query, params);
  return results[0].total;
}
/* 搞定categoryId    | string  | 否   | 分类筛选               | 大类，如漫威宇宙-        end */

/* | 搞定ratio       | string  | 否   | 图片比例1:1            | 1:1/3:4/4:3            |begin */
/**
 * 按比例查找图像（带分页）
 * @description 图像属性管理功能，支持基于图像比例的检索和分页控制
 * @param {Object} criteria 查询条件，包含ratio、currentPage、pageSize等参数
 * @returns {Promise<Array>} 返回匹配的图像数组
 */
async function findImagesByRatio(criteria) {
  let connection;
  try {
    console.log(`开始查询宽高比为 ${criteria.ratio} 的图片列表`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT * FROM images_ext
      WHERE ratio = ?
      LIMIT ? OFFSET ?
    `;
    const params = [
      criteria.ratio,
      criteria.pageSize,
      (criteria.currentPage - 1) * criteria.pageSize
    ];
    const [results] = await connection.query(query, params);
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error(`查询宽高比为 ${criteria.ratio} 的图片列表时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 统计特定比例图像数量
 * @description 数据分析功能，快速统计特定比例的图像总数
 * @param {Object} criteria 查询条件，主要包含ratio参数
 * @returns {Promise<number>} 返回特定比例图像的总数
 */
async function countImagesByRatio(criteria) {
  let connection;
  try {
    console.log(`开始统计宽高比为 ${criteria.ratio} 的图片总数`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT COUNT(*) AS total FROM images_ext
      WHERE ratio = ?
    `;
    const params = [criteria.ratio];
    const [results] = await connection.query(query, params);
    console.log(`统计结果：宽高比为 ${criteria.ratio} 的图片总数为 ${results[0].total}`);

    return results[0].total;
  } catch (error) {
    console.error(`统计宽高比为 ${criteria.ratio} 的图片总数时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* | 搞定ratio       | string  | 否   | 图片比例1:1            | 1:1/3:4/4:3            end */


/* | 搞定type        | string  | 否   | 图片类型               | text2image/image2image | begin */
/**
 * 按类型查找图像（带分页）
 * @description 图像类型管理功能，支持基于类型的图像检索和分页控制
 * @param {Object} criteria 查询条件，包含type、currentPage、pageSize等参数
 * @returns {Promise<Array>} 返回匹配的图像数组
 */
async function findImagesByType(criteria) {
  let connection;
  try {
    console.log(`开始查询类型为 ${criteria.type} 的图片列表`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT * FROM images_ext
      WHERE type = ?
      LIMIT ? OFFSET ?
    `;
    const params = [
      criteria.type,
      criteria.pageSize,
      (criteria.currentPage - 1) * criteria.pageSize
    ];
    const [results] = await connection.query(query, params);
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error(`查询类型为 ${criteria.type} 的图片列表时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 统计特定类型图像数量
 * @description 数据分析功能，快速统计特定类型的图像总数
 * @param {Object} criteria 查询条件，主要包含type参数
 * @returns {Promise<number>} 返回特定类型图像的总数
 */
async function countImagesByType(criteria) {
  let connection;
  try {
    console.log(`开始统计类型为 ${criteria.type} 的图片总数`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT COUNT(*) AS total FROM images_ext
      WHERE type = ?
    `;
    const params = [criteria.type];
    const [results] = await connection.query(query, params);
    console.log(`统计结果：类型为 ${criteria.type} 的图片总数为 ${results[0].total}`);

    return results[0].total;
  } catch (error) {
    console.error(`统计类型为 ${criteria.type} 的图片总数时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* | 搞定type        | string  | 否   | 图片类型               | text2image/image2image | end */

/* | 搞定userId      | string  | 否   | 用户ID筛选             | -                      | begin */
/**
 * 按用户ID查找图像（带分页）
 * @description 用户图像管理功能，支持基于用户ID的图像检索和分页控制
 * @param {Object} criteria 查询条件，包含userId、currentPage、pageSize等参数
 * @returns {Promise<Array>} 返回匹配的图像数组
 */
async function findImagesByUserId(criteria) {
  let connection;
  try {
    console.log(`开始查询用户 ${criteria.userId} 的图片列表`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT * FROM images_ext
      WHERE userId = ?
      LIMIT ? OFFSET ?
    `;
    const params = [
      criteria.userId,
      criteria.pageSize,
      (criteria.currentPage - 1) * criteria.pageSize
    ];
    const [results] = await connection.query(query, params);
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error(`查询用户 ${criteria.userId} 的图片列表时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 统计用户图像数量
 * @description 数据分析功能，快速统计特定用户的图像总数
 * @param {Object} criteria 查询条件，主要包含userId参数
 * @returns {Promise<number>} 返回用户图像的总数
 */
async function countImagesByUserId(criteria) {
  const connection = await getConnection();
  const query = `
    SELECT COUNT(*) AS total FROM images_ext
    WHERE userId = ?
  `;
  const params = [criteria.userId];
  const [results] = await connection.query(query, params);
  return results[0].total;
}
/* | 搞定userId      | string  | 否   | 用户ID筛选             | -                      | end */

/* | 搞定isPublic    | boolean | 否   | 是否公开                | -                     | begin*/

/**
 * 按公开状态查找图像（带分页）
 * @description 权限管理功能，支持基于公开状态的图像检索和分页控制
 * @param {Object} criteria 查询条件，包含isPublic、currentPage、pageSize等参数
 * @returns {Promise<Array>} 返回匹配的图像数组
 */
async function findImagesByIsPublic(criteria) {
  let connection;
  try {
    console.log(`开始查询公开状态为 ${criteria.isPublic} 的图片列表`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT * FROM images_ext
      WHERE isPublic = ?
      LIMIT ? OFFSET ?
    `;
    const params = [
      criteria.isPublic,
      criteria.pageSize,
      (criteria.currentPage - 1) * criteria.pageSize
    ];
    const [results] = await connection.query(query, params);
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error(`查询公开状态为 ${criteria.isPublic} 的图片列表时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 统计特定公开状态图像数量
 * @description 数据分析功能，快速统计特定公开状态的图像总数
 * @param {Object} criteria 查询条件，主要包含isPublic参数
 * @returns {Promise<number>} 返回特定公开状态图像的总数
 */
async function countImagesByIsPublic(criteria) {
  let connection;
  try {
    console.log(`开始统计公开状态为 ${criteria.isPublic} 的图片总数`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT COUNT(*) AS total FROM images_ext
      WHERE isPublic = ?
    `;
    const params = [criteria.isPublic];
    const [results] = await connection.query(query, params);
    console.log(`统计结果：总数为 ${results[0].total}`);

    return results[0].total;
  } catch (error) {
    console.error(`统计公开状态为 ${criteria.isPublic} 的图片总数时发生错误:`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* | 搞定isPublic    | boolean | 否   | 是否公开               | -                      | end*/

/* | 搞定查找 全部图片内容          | -         | begin*/
/**
 * 分页获取所有图像
 * @description 基础图像检索功能，支持分页获取所有图像记录
 * @param {Object} criteria 查询条件，主要包含currentPage和pageSize参数
 * @returns {Promise<Array>} 返回分页后的图像数组
 */
async function findImages(criteria) {
  let connection;
  try {
    console.log('开始查询图片列表');
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT * FROM images_ext
      LIMIT ? OFFSET ?
    `;
    const params = [
      criteria.pageSize,
      (criteria.currentPage - 1) * criteria.pageSize
    ];
    const [results] = await connection.query(query, params);
    console.log(`查询结果：`, results);

    return results;
  } catch (error) {
    console.error('查询图片列表时发生错误:', error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 统计所有图像数量
 * @description 数据汇总功能，快速获取图像库中的总图像数
 * @returns {Promise<number>} 返回图像库中的总图像数
 */
async function countImages(criteria) {
  let connection;
  try {
    console.log('开始统计图片总数');
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const query = `
      SELECT COUNT(*) AS total FROM images_ext
    `;
    const [results] = await connection.query(query);
    console.log(`统计结果：总数为 ${results[0].total}`);

    return results[0].total;
  } catch (error) {
    console.error('统计图片总数时发生错误:', error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* | 搞定查找 全部图片内容          | -         | end*/


/* | 搞定查找 自己通过task id 传送信息          | -         | begin*/
/**
 * 更新图像任务ID----这个是给自己用的，因为没办法找到原始图，只能转一圈回来
 * @description 任务管理功能，支持更新图像记录中的任务ID信息
 * @param {string} id 图像ID，用于定位要更新的记录
 * @param {string} taskId 新的任务ID，用于更新记录
 */
async function updateImageTaskIdByid(id, taskId) {
  let connection;
  try {
    console.log(`开始更新图片任务ID，图片ID：${id}，新任务ID：${taskId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    await connection.query(
      'UPDATE images_ext SET crt_task_id = ? WHERE id = ?',
      [taskId, id]
    );
    console.log(`图片任务ID更新成功，图片ID：${id}`);
  } catch (error) {
    console.error(`更新图片任务ID时发生错误，图片ID：${id}，任务ID：${taskId}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/**
 * 通过任务ID查找图像
 * @description 企业级图像追踪功能，支持基于任务ID的图像检索
 * @param {string} taskId 任务ID，用于匹配相关图像
 * @returns {Promise<Object|null>} 返回匹配的图像对象或null
 */
async function findImageByTaskId(taskId) {
  let connection;
  try {
    console.log(`开始通过任务ID查找图片，任务ID：${taskId}`);
    connection = await getConnection();
    console.log(`获取数据库连接成功，连接ID：${connection.threadId}`);

    const [results] = await connection.query(
      'SELECT * FROM images_ext WHERE crt_task_id = ?',
      [taskId]
    );
    console.log(`查询结果：`, results[0]);

    return results[0] || null;
  } catch (error) {
    console.error(`通过任务ID查找图片时发生错误，任务ID：${taskId}`, error);
    throw error;
  } finally {
    if (connection) {
      console.log(`开始释放数据库连接，连接ID：${connection.threadId}`);
      connection.release();
      console.log(`数据库连接已释放，连接ID：${connection.threadId}`);
    }
  }
}
/* | 搞定查找 自己通过task id 传送信息          | -         | end*/


/**
 * ***************************************************************五星难度**********************************
 * 获取分类信息和相关图像计数
 * @description 分类管理功能，支持获取分类详情及每个分类下的图像数量
 * @param {string} lang 语言参数，用于获取多语言分类名称
 * @returns {Promise<Object>} 返回包含categories和tags的对象，其中tags包含计数信息
 */


// 获取所有分类和标签信息
async function getCategoriesm(lang) {
  const connection = await getConnection();
  try {
    // 查询分类信息
    const [categories] = await connection.query(
      `
      SELECT category_code, category_alias,
             display_name_${lang} AS displayName,
             description_${lang} AS description,
             thumbnailUrl
      FROM categories
      `
    );

    // 查询标签信息及其计数
    const [tags] = await connection.query(
      `
      SELECT t.tag_code, t.tag_alias,
             t.display_name_${lang} AS displayname,
             COUNT(it.image_id) AS count
      FROM newtags t
      LEFT JOIN new_image_tags it ON t.tag_id = it.tag_id
      GROUP BY t.tag_id
      `
    );

    return {
      categories,
      tags
    };
  } finally {
    connection.release();
  }

}





module.exports = {
  findImagesByQuery,
  countImagesByQuery,
  findImagesByCategoryId,
  countImagesByCategoryId,
  findImagesByTags,
  countImagesByTags,
  findImagesByRatio,
  countImagesByRatio,
  findImagesByType,
  countImagesByType,
  findImagesByUserId,
  countImagesByUserId,
  findImagesByIsPublic,
  countImagesByIsPublic,
  findImages,
  countImages,
  createImageExt,
  findImagesByUserId,
  findImageById,
  updateImageByIdm,
  deleteImage,
  updateImageTaskIdByid, 
  findImageByTaskId,
  getCategoriesm,
  createTagsAndAssociations
};