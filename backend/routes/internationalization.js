const express = require('express')
const axios = require('axios')
const router = express.Router()
const { executeQuery } = require('../database')

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

// 支持的语言配置
const SUPPORTED_LANGUAGES = {
  'en': '英语 (English)',
  'ja': '日语 (Japanese)',
  'ko': '韩语 (Korean)',
  'fr': '法语 (French)',
  'de': '德语 (German)',
  'es': '西班牙语 (Spanish)',
  'it': '意大利语 (Italian)',
  'pt': '葡萄牙语 (Portuguese)',
  'ru': '俄语 (Russian)',
  'ar': '阿拉伯语 (Arabic)'
}

// 测试接口 - 返回模拟数据用于调试
router.post('/test', async (req, res) => {
  try {
    const { type, items, targetLanguages } = req.body

    console.log('测试国际化请求:', { type, items, targetLanguages })

    // 创建模拟翻译结果
    const results = {}
    items.forEach(item => {
      results[item.id] = {}
      targetLanguages.forEach(lang => {
        results[item.id][lang] = {
          name: `${item.name} (${lang.toUpperCase()})`,
          description: item.description ? `${item.description} (${lang.toUpperCase()})` : ''
        }
      })
    })

    console.log('测试翻译结果:', JSON.stringify(results, null, 2))

    res.json({
      success: true,
      message: `测试模式：生成了 ${items.length} 个${type === 'categories' ? '分类' : '标签'}的 ${targetLanguages.length} 种语言翻译`,
      results
    })
  } catch (error) {
    console.error('测试接口错误:', error)
    res.status(500).json({
      success: false,
      message: error.message
    })
  }
})

// 国际化翻译接口
router.post('/', async (req, res) => {
  try {
    const { type, items, targetLanguages } = req.body

    // 验证参数
    if (!type || !items || !targetLanguages) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: type, items, targetLanguages'
      })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'items 必须是非空数组'
      })
    }

    if (!Array.isArray(targetLanguages) || targetLanguages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'targetLanguages 必须是非空数组'
      })
    }

    // 验证支持的语言
    const unsupportedLanguages = targetLanguages.filter(lang => !SUPPORTED_LANGUAGES[lang])
    if (unsupportedLanguages.length > 0) {
      return res.status(400).json({
        success: false,
        message: `不支持的语言: ${unsupportedLanguages.join(', ')}`
      })
    }

    // 验证类型
    if (!['categories', 'tags', 'content'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type 必须是 categories、tags 或 content'
      })
    }

    console.log(`开始国际化 ${type}:`, {
      itemCount: items.length,
      targetLanguages,
      items: items.map(item => ({ id: item.id, name: item.name }))
    })

    // 调用AI进行翻译
    const results = await translateItems(type, items, targetLanguages)

    res.json({
      success: true,
      message: `成功翻译了 ${items.length} 个${type === 'categories' ? '分类' : '标签'}到 ${targetLanguages.length} 种语言`,
      results
    })

  } catch (error) {
    console.error('国际化失败:', error)
    res.status(500).json({
      success: false,
      message: error.message || '国际化处理失败'
    })
  }
})

// 保存国际化翻译结果到数据库
router.post('/save', async (req, res) => {
  try {
    const { type, translations } = req.body

    // 验证参数
    if (!type || !translations) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: type, translations'
      })
    }

    if (!['categories', 'tags', 'content'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type 必须是 categories、tags 或 content'
      })
    }

    console.log(`开始保存 ${type} 国际化翻译:`, {
      itemCount: Object.keys(translations).length,
      type
    })

    let savedCount = 0
    let errorCount = 0
    const errors = []

    // 遍历每个项目的翻译
    for (const [itemId, itemTranslations] of Object.entries(translations)) {
      try {
        // 获取当前项目的数据
        const tableName = type === 'categories' ? 'categories' : 'tags'
        const idField = type === 'categories' ? 'category_id' : 'tag_id'

        const currentRows = await executeQuery(
          `SELECT display_name, description FROM ${tableName} WHERE ${idField} = ?`,
          [itemId]
        )

        if (currentRows.length === 0) {
          errors.push(`${type === 'categories' ? '分类' : '标签'} ID ${itemId} 不存在`)
          errorCount++
          continue
        }

        const currentItem = currentRows[0]

        // 解析当前的多语言数据
        let displayName = {}
        let description = {}

        if (typeof currentItem.display_name === 'string') {
          try {
            displayName = JSON.parse(currentItem.display_name)
          } catch {
            displayName = { zh: currentItem.display_name }
          }
        } else if (typeof currentItem.display_name === 'object') {
          displayName = currentItem.display_name || {}
        }

        if (typeof currentItem.description === 'string') {
          try {
            description = JSON.parse(currentItem.description)
          } catch {
            description = { zh: currentItem.description }
          }
        } else if (typeof currentItem.description === 'object') {
          description = currentItem.description || {}
        }

        // 合并新的翻译
        for (const [langCode, translation] of Object.entries(itemTranslations)) {
          if (translation.name) {
            displayName[langCode] = translation.name
          }
          if (translation.description) {
            description[langCode] = translation.description
          }
        }

        // 更新数据库
        await executeQuery(
          `UPDATE ${tableName} SET display_name = ?, description = ? WHERE ${idField} = ?`,
          [JSON.stringify(displayName), JSON.stringify(description), itemId]
        )

        savedCount++
        console.log(`✅ 已保存 ${type} ID ${itemId} 的翻译`)

      } catch (itemError) {
        console.error(`保存 ${type} ID ${itemId} 翻译失败:`, itemError)
        errors.push(`${type === 'categories' ? '分类' : '标签'} ID ${itemId}: ${itemError.message}`)
        errorCount++
      }
    }

    // 返回结果
    const totalCount = Object.keys(translations).length
    res.json({
      success: savedCount > 0,
      message: `保存完成：成功 ${savedCount} 个，失败 ${errorCount} 个`,
      savedCount,
      errorCount,
      totalCount,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('保存国际化翻译失败:', error)
    res.status(500).json({
      success: false,
      message: error.message || '保存翻译失败'
    })
  }
})

// 翻译处理函数
async function translateItems(type, items, targetLanguages) {
  const results = {}

  // 构建翻译请求
  const prompt = buildTranslationPrompt(type, items, targetLanguages)

  try {
    // 调用DeepSeek API
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: type === 'content'
            ? '你是一个专业的多语言翻译专家，专门负责将中文的图片内容(包括名称、标题、描述、AI提示词)翻译成多种语言。请确保翻译准确、专业，并保持原意。对于AI提示词要保持其技术性和描述性。必须返回严格的JSON格式，不要包含任何其他文字说明。'
            : '你是一个专业的多语言翻译专家，专门负责将中文的分类名称和标签翻译成多种语言。请确保翻译准确、专业，并保持原意。必须返回严格的JSON格式，不要包含任何其他文字说明。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    })

    const responseText = response.data.choices[0].message.content.trim()
    console.log('AI翻译响应原文:', responseText)

    // 解析AI响应
    let translationData
    try {
      // 尝试提取JSON部分
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log('提取的JSON部分:', jsonMatch[0])
        translationData = JSON.parse(jsonMatch[0])
      } else {
        console.log('直接解析整个响应作为JSON')
        translationData = JSON.parse(responseText)
      }
      console.log('解析后的翻译数据:', JSON.stringify(translationData, null, 2))
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError)
      console.error('原始响应文本:', responseText)
      throw new Error('AI返回的翻译结果格式错误: ' + parseError.message)
    }

    // 处理翻译结果
    items.forEach(item => {
      const itemTranslations = translationData[item.id.toString()]
      if (itemTranslations) {
        results[item.id] = itemTranslations
      } else {
        // 如果AI没有返回该项的翻译，创建默认值
        results[item.id] = {}
        targetLanguages.forEach(lang => {
          if (type === 'content') {
            results[item.id][lang] = {
              name: item.name || '未翻译',
              title: item.title || '未翻译',
              description: item.description || '',
              prompt: item.prompt || ''
            }
          } else {
            results[item.id][lang] = {
              name: item.name || '未翻译',
              description: item.description || ''
            }
          }
        })
      }
    })

    return results

  } catch (error) {
    console.error('调用AI翻译服务失败:', error)

    // 如果AI翻译失败，返回默认结果
    console.log('AI翻译失败，返回默认翻译结果')
    items.forEach(item => {
      results[item.id] = {}
      targetLanguages.forEach(lang => {
        if (type === 'content') {
          results[item.id][lang] = {
            name: `${item.name} (${SUPPORTED_LANGUAGES[lang]})`,
            title: item.title ? `${item.title} (${SUPPORTED_LANGUAGES[lang]})` : '',
            description: item.description ? `${item.description} (${SUPPORTED_LANGUAGES[lang]})` : '',
            prompt: item.prompt ? `${item.prompt} (${SUPPORTED_LANGUAGES[lang]})` : ''
          }
        } else {
          results[item.id][lang] = {
            name: `${item.name} (${SUPPORTED_LANGUAGES[lang]})`,
            description: item.description ? `${item.description} (${SUPPORTED_LANGUAGES[lang]})` : ''
          }
        }
      })
    })

    return results
  }
}

// 构建翻译提示词
function buildTranslationPrompt(type, items, targetLanguages) {
  let typeLabel
  if (type === 'categories') {
    typeLabel = '分类'
  } else if (type === 'tags') {
    typeLabel = '标签'
  } else if (type === 'content') {
    typeLabel = '内容'
  }

  const languageNames = targetLanguages.map(lang => SUPPORTED_LANGUAGES[lang]).join('、')

  let prompt = `请将以下${typeLabel}翻译成${languageNames}。

要求：
1. 翻译要准确、专业，适合涂色书应用场景
2. 保持原意和语境
3. 必须返回严格的JSON格式，不要添加任何解释文字
4. 如果描述为空，翻译后的描述也可以为空
5. 确保每个项目的ID都在返回的JSON中
${type === 'content' ? '6. 对于内容翻译，name字段是标题，description字段是详细内容' : ''}

需要翻译的${typeLabel}：
`

  items.forEach(item => {
    if (type === 'content') {
      prompt += `
ID: ${item.id}
名称: ${item.name}
标题: ${item.title || ''}
描述: ${item.description || ''}
提示词: ${item.prompt || ''}
---`
    } else {
      prompt += `
ID: ${item.id}
名称: ${item.name}
描述: ${item.description || ''}
---`
    }
  })

  prompt += `

请返回以下JSON格式：
{
  "item_id_1": {
    "language_code_1": {
      "name": "翻译后的名称",${type === 'content' ? '\n      "title": "翻译后的标题",' : ''}
      "description": "翻译后的描述"${type === 'content' ? ',\n      "prompt": "翻译后的提示词"' : ''}
    },
    "language_code_2": {
      "name": "翻译后的名称",${type === 'content' ? '\n      "title": "翻译后的标题",' : ''}
      "description": "翻译后的描述"${type === 'content' ? ',\n      "prompt": "翻译后的提示词"' : ''}
    }
  },
  "item_id_2": {
    // 同样的格式
  }
}

语言代码对应关系：
${targetLanguages.map(lang => `${lang}: ${SUPPORTED_LANGUAGES[lang]}`).join('\n')}

请确保返回的JSON格式正确，并且包含所有请求的${typeLabel}和语言。`

  return prompt
}

module.exports = router 