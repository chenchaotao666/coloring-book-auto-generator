const express = require('express')
const axios = require('axios')
const router = express.Router()
const { executeQuery } = require('../database')

// DeepSeek API配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY

// 支持的语言配置
const SUPPORTED_LANGUAGES = {
  'zh': '中文 (Chinese)',
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
  console.log('🔍 translateItems 函数接收到的参数:')
  console.log('- type:', type)
  console.log('- targetLanguages:', targetLanguages)
  console.log('- items数量:', items.length)
  console.log('- items详细信息:', JSON.stringify(items, null, 2))

  // 验证输入参数
  const invalidItems = items.filter(item => !item || item.id === undefined || item.id === null)
  if (invalidItems.length > 0) {
    console.error('❌ 发现无效的items:', invalidItems)
    throw new Error('请求数据中包含无效的项目，请检查数据完整性')
  }

  const results = {}
  const maxRetries = 2 // 重试次数
  let lastError = null

  // 检查API密钥
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_deepseek_api_key_here') {
    throw new Error('DeepSeek API密钥未配置或配置错误，请检查环境变量 DEEPSEEK_API_KEY')
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`AI翻译尝试 ${attempt}/${maxRetries}`)
      console.log(`目标语言: ${targetLanguages.join(', ')}`)
      console.log(`翻译项目数量: ${items.length}`)

      // 如果是重试，添加短暂延迟
      if (attempt > 1) {
        console.log(`等待 ${attempt * 2} 秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, attempt * 2000))
      }

      // 调用DeepSeek API
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: type === 'content'
              ? `你是一个专业的多语言翻译专家，专门负责儿童涂色书应用的内容翻译。

你的任务：
1. 将中文的涂色书内容(名称、标题、描述、AI提示词)翻译成目标语言
2. 翻译要自然流畅，符合目标语言的表达习惯
3. 对于儿童涂色书主题，使用儿童友好的词汇和表达
4. AI提示词要保持技术准确性，但措辞要符合目标语言习惯
5. 严格按照JSON格式返回，不要添加任何解释文字

翻译原则：
- 准确传达原意
- 语言自然流畅
- 适合儿童理解
- 保持专业性`
              : `你是一个专业的多语言翻译专家，专门负责将中文的分类名称和标签翻译成多种语言。

你的任务：
1. 准确翻译分类/标签名称和描述
2. 翻译要自然流畅，符合目标语言习惯
3. 保持原意和专业性
4. 严格按照JSON格式返回，不要添加任何解释文字

翻译原则：
- 准确传达原意
- 语言自然流畅
- 保持专业性`
          },
          {
            role: 'user',
            content: buildTranslationPrompt(type, items, targetLanguages)
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000, // 增加到2分钟
        signal: AbortSignal.timeout(120000) // 添加AbortSignal作为备用
      })

      const responseText = response.data.choices[0].message.content.trim()
      console.log('AI翻译响应原文:', responseText)

      // 解析AI响应
      let translationData
      let cleanedText = responseText.trim()

      try {
        // 清理响应文本
        cleanedText = responseText.trim()

        // 移除可能的markdown代码块标记
        cleanedText = cleanedText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')

        // 添加特殊字符处理函数
        function sanitizeJsonString(jsonString) {
          try {
            // 先尝试直接解析，如果成功就不需要清理
            JSON.parse(jsonString)
            return jsonString
          } catch (e) {
            console.log('需要清理JSON字符串中的特殊字符，错误:', e.message)

            // 改进的清理方法：保留换行符和HTML标签，但确保正确转义
            let result = jsonString

            // 首先处理其他控制字符（但保留换行符、回车符、制表符）
            result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')

            // 使用状态机来跟踪是否在字符串内部，正确转义特殊字符
            let inString = false
            let escaped = false
            let resultChars = []

            for (let i = 0; i < result.length; i++) {
              const char = result[i]

              if (escaped) {
                escaped = false
                resultChars.push(char)
                continue
              }

              if (char === '\\') {
                escaped = true
                resultChars.push(char)
                continue
              }

              if (char === '"') {
                inString = !inString
                resultChars.push(char)
                continue
              }

              // 如果在字符串内部，需要转义特殊字符但保留内容
              if (inString) {
                if (char === '\n') {
                  resultChars.push('\\', 'n')  // 转义换行符但保留其含义
                } else if (char === '\r') {
                  resultChars.push('\\', 'r')  // 转义回车符但保留其含义
                } else if (char === '\t') {
                  resultChars.push('\\', 't')  // 转义制表符但保留其含义
                } else {
                  resultChars.push(char)  // 其他字符（包括HTML标签）直接保留
                }
              } else {
                resultChars.push(char)
              }
            }

            result = resultChars.join('')
            console.log('清理后尝试再次解析...')
            return result
          }
        }

        // 尝试提取JSON部分（最外层的大括号）
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          console.log('提取的JSON部分:', jsonMatch[0])
          const sanitizedJson = sanitizeJsonString(jsonMatch[0])
          console.log('清理后的JSON:', sanitizedJson)
          translationData = JSON.parse(sanitizedJson)
        } else {
          console.log('直接解析整个响应作为JSON')
          const sanitizedJson = sanitizeJsonString(cleanedText)
          console.log('清理后的JSON:', sanitizedJson)
          translationData = JSON.parse(sanitizedJson)
        }

        console.log('解析后的翻译数据:', JSON.stringify(translationData, null, 2))

        // 验证翻译数据的完整性
        const missingItems = []
        items.forEach(item => {
          // 添加防护性检查，确保item.id不是undefined
          if (!item || item.id === undefined || item.id === null) {
            console.error('❌ 发现无效的item:', item)
            missingItems.push('undefined_item')
            return
          }

          if (!translationData[item.id.toString()]) {
            missingItems.push(item.id)
          }
        })

        if (missingItems.length > 0) {
          console.warn('以下项目缺少翻译:', missingItems)
        }

      } catch (parseError) {
        console.error('解析AI响应失败:', parseError)
        console.error('原始响应文本:', responseText)
        console.error('清理后的文本:', cleanedText)
        throw new Error(`AI返回的翻译结果格式错误: ${parseError.message}。请重试或检查原始内容是否包含特殊字符。`)
      }

      // 处理翻译结果
      items.forEach(item => {
        // 添加防护性检查，确保item.id不是undefined
        if (!item || item.id === undefined || item.id === null) {
          console.error('❌ 处理翻译结果时发现无效的item:', item)
          return
        }

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
                prompt: item.prompt || '',
                additionalInfo: item.additionalInfo || ''
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

      // 翻译成功，返回结果
      console.log(`AI翻译成功完成 (尝试 ${attempt}/${maxRetries})`)
      return results

    } catch (error) {
      console.error(`AI翻译尝试 ${attempt}/${maxRetries} 失败:`, error)
      console.error('错误详情:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status
      })

      lastError = error

      // 判断是否应该重试 - 增加更多网络错误类型
      const isNetworkError = error.code === 'ECONNABORTED' ||
        error.message.includes('aborted') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNRESET' ||
        error.message.includes('timeout') ||
        error.message.includes('network')

      const isServerError = error.response?.status >= 500
      const isRateLimitError = error.response?.status === 429

      const shouldRetry = attempt < maxRetries && (isNetworkError || isServerError || isRateLimitError)

      if (shouldRetry) {
        // 根据错误类型调整延迟时间
        let delayMs = 2000 * attempt // 基础延迟
        if (isRateLimitError) {
          delayMs = 5000 * attempt // 限流错误延迟更长
        } else if (isNetworkError) {
          delayMs = 3000 * attempt // 网络错误适中延迟
        }

        console.log(`将在 ${delayMs}ms 后重试 AI翻译 (${attempt + 1}/${maxRetries})`)
        console.log(`重试原因: ${isNetworkError ? '网络错误' : isServerError ? '服务器错误' : isRateLimitError ? '限流错误' : '其他错误'}`)

        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue // 继续循环，进行重试
      } else {
        // 不应该重试或已达到最大重试次数，抛出错误
        console.log(`不再重试，原因: ${attempt >= maxRetries ? '已达最大重试次数' : '非可重试错误'}`)
        break
      }
    }
  }

  // 所有重试都失败了，抛出最后一个错误
  console.error('所有AI翻译尝试都失败了')

  // 根据不同的错误类型提供更具体的错误信息
  let errorMessage = '未知错误'
  if (lastError.code === 'ECONNABORTED' || lastError.message.includes('aborted')) {
    errorMessage = '请求超时，翻译内容可能过长，请尝试减少翻译内容或稍后重试'
  } else if (lastError.code === 'ECONNREFUSED') {
    errorMessage = '无法连接到AI服务，请检查网络连接'
  } else if (lastError.response?.status === 401) {
    errorMessage = 'API密钥无效，请检查DeepSeek API配置'
  } else if (lastError.response?.status === 429) {
    errorMessage = 'API调用频率过高，请稍后重试'
  } else if (lastError.response?.status >= 500) {
    errorMessage = 'AI服务暂时不可用，请稍后重试'
  } else if (lastError.message) {
    errorMessage = lastError.message
  }

  throw new Error(`AI翻译服务调用失败: ${errorMessage}`)
}

// 构建翻译提示词
function buildTranslationPrompt(type, items, targetLanguages) {
  let typeLabel
  if (type === 'categories') {
    typeLabel = '分类'
  } else if (type === 'tags') {
    typeLabel = '标签'
  } else if (type === 'content') {
    typeLabel = '涂色书内容'
  }

  const languageNames = targetLanguages.map(lang => SUPPORTED_LANGUAGES[lang]).join('、')

  // 检测主要基础语言（大多数项目使用的语言）
  const baseLanguageCounts = {}
  items.forEach(item => {
    const baseLang = item.baseLanguage || 'zh'
    baseLanguageCounts[baseLang] = (baseLanguageCounts[baseLang] || 0) + 1
  })

  const primaryBaseLanguage = Object.keys(baseLanguageCounts).reduce((a, b) =>
    baseLanguageCounts[a] > baseLanguageCounts[b] ? a : b, 'zh')

  const baseLanguageName = SUPPORTED_LANGUAGES[primaryBaseLanguage] || '中文'

  let prompt = `作为专业翻译专家，请将以下${typeLabel}从${baseLanguageName}准确翻译成${languageNames}。

重要要求：
1. 原文主要使用${baseLanguageName}，请基于原文进行翻译
2. 翻译要自然、准确、专业，适合儿童涂色书应用场景
3. 保持原文的意思和语调，符合目标语言习惯
4. 对于涂色书主题，要使用儿童友好的表达方式
5. AI提示词要保持技术性，但翻译要准确
6. 必须严格按照JSON格式返回，不要添加任何解释文字
7. 确保每个项目的ID都在返回的JSON中
8. 可以保留HTML标签（如<h2>、<h3>等）和换行符来保持格式
9. 确保所有双引号在JSON字符串中正确转义为 \"
10. 保持原文的段落结构和格式标签
${type === 'content' ? '11. name字段是简短名称，title字段是完整标题，description是详细内容描述，prompt是AI生成图片的提示词，additionalInfo是文案内容' : ''}

需要翻译的${typeLabel}：
`

  items.forEach(item => {
    // 添加验证，确保item和item.id有效
    if (!item || item.id === undefined || item.id === null) {
      console.error('❌ buildTranslationPrompt中发现无效item:', item)
      return
    }

    const itemBaseLanguage = item.baseLanguage || 'zh'
    const itemBaseLanguageName = SUPPORTED_LANGUAGES[itemBaseLanguage] || '中文'

    if (type === 'content') {
      prompt += `
ID: ${item.id} (原文语言: ${itemBaseLanguageName})
简短名称: ${item.name || ''}
完整标题: ${item.title || ''}
内容描述: ${item.description || ''}
AI提示词: ${item.prompt || ''}
文案内容: ${item.additionalInfo || ''}
---`
    } else {
      prompt += `
ID: ${item.id} (原文语言: ${itemBaseLanguageName})
名称: ${item.name}
描述: ${item.description || ''}
---`
    }
  })

  prompt += `

请严格按照以下JSON格式返回翻译结果：
{
  "${items[0]?.id}": {
    "${targetLanguages[0]}": {
      "name": "翻译后的简短名称",${type === 'content' ? '\n      "title": "翻译后的完整标题",' : ''}
      "description": "翻译后的描述"${type === 'content' ? ',\n      "prompt": "翻译后的AI提示词",\n      "additionalInfo": "翻译后的文案内容"' : ''}
    }${targetLanguages.length > 1 ? `,\n    "${targetLanguages[1]}": {\n      "name": "翻译后的简短名称",${type === 'content' ? '\n      "title": "翻译后的完整标题",' : ''}\n      "description": "翻译后的描述"${type === 'content' ? ',\n      "prompt": "翻译后的AI提示词",\n      "additionalInfo": "翻译后的文案内容"' : ''}\n    }` : ''}
  }${items.length > 1 ? `,\n  "${items[1]?.id}": {\n    // 同样的语言翻译格式\n  }` : ''}
}

语言代码说明：
${targetLanguages.map(lang => `${lang}: ${SUPPORTED_LANGUAGES[lang]}`).join('\n')}

请确保：
- JSON格式严格正确
- 包含所有${items.length}个项目
- 每个项目包含所有${targetLanguages.length}种目标语言
- 翻译自然流畅，符合目标语言习惯
- 不要添加任何JSON之外的文字说明
- 保留原文的HTML标签和换行符格式
- 只需要转义JSON中的双引号（\" ），其他格式标签可以直接使用
- 所有内容应该是有效的JSON字符串，可以被JSON.parse()正确解析`

  return prompt
}

module.exports = router