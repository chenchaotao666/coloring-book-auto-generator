const express = require('express')
const cors = require('cors')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
const XLSX = require('xlsx')
require('dotenv').config()

// KIEAI图片生成API配置
const KIEAI_API_URL = process.env.KIEAI_API_URL || 'https://kieai.erweima.ai/api/v1'
const KIEAI_AUTH_TOKEN = process.env.KIEAI_AUTH_TOKEN || '27e443bd81969aefddc051bd78fa0a01'

// 专业涂色页配置 (基于colobook-0609/config/prp.config.js)
const COLORING_PAGE_CONFIG = {
  // 基础指令
  baseInstructions: "Generate a black and white line art coloring page (8.5×8.5 inches) with the following specifications:",

  // 艺术风格要求
  artworkRules: {
    background: "Pure white background – No shading, textures, or gray tones.",
    lines: "Solid black lines only – All details drawn with 1mm thick uniform black lines, no gradients.",
    border: "Hand-drawn border – 1.5mm-2mm thick organic, slightly wavy border (no straight edges), placed 0.5cm inside the page edge."
  },

  // 文本标签
  textLabel: "Add 'printablecoloringhub.com' in simple sans-serif font, centered at the bottom of the overall 8.5×8.5 inch page. This text MUST be placed outside the hand-drawn border, in the space between the border and the bottom edge of the page, or clearly outside and below the border.",

  // 输出要求
  outputRequirements: "100% vector-friendly, high-contrast line art suitable for printing and coloring."
}

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 创建必要的目录
const storageDir = path.join(__dirname, '../storage')
const imagesDir = path.join(__dirname, '../images')

fs.ensureDirSync(storageDir)
fs.ensureDirSync(imagesDir)

// 第一步：生成主题的API
app.post('/api/generate-themes', async (req, res) => {
  const { keyword, description, count, model } = req.body

  // 设置服务器发送事件 (SSE) 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })

  try {
    // 发送开始生成的消息
    res.write(`data: ${JSON.stringify({
      type: 'start',
      message: `开始生成${count}个主题...`,
      total: count
    })}\n\n`)

    const themes = await generateThemes(keyword, description, count, model)

    // 逐个发送生成的主题
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i]
      const contentId = `content_${Date.now()}_${i}`

      const contentItem = {
        id: contentId,
        index: i + 1,
        title: theme.title,
        prompt: theme.prompt,
        description: theme.description || '',
        content: null, // 等待第二步生成
        generatedAt: new Date().toISOString(),
        step: 1
      }

      // 发送主题结果
      res.write(`data: ${JSON.stringify({
        type: 'theme_content',
        content: contentItem,
        stepProgress: i + 1,
        totalItems: count
      })}\n\n`)

      console.log(`✅ 主题生成完成 ${i + 1}/${count}: ${theme.title}`)

      // 添加延迟
      if (i < themes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // 发送完成消息
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: `主题生成完成！共生成${themes.length}个主题`,
      successCount: themes.length,
      totalCount: count
    })}\n\n`)

    res.end()
  } catch (error) {
    console.error('生成主题错误:', error)
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: `生成主题出错: ${error.message}`
    })}\n\n`)
    res.end()
  }
})

// 第二步：生成文案的API
app.post('/api/generate-content', async (req, res) => {
  const { items, keyword, model } = req.body

  // 设置服务器发送事件 (SSE) 响应头
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })

  try {
    // 发送开始生成的消息
    res.write(`data: ${JSON.stringify({
      type: 'start',
      message: `开始为${items.length}个主题生成文案...`,
      total: items.length
    })}\n\n`)

    const contentTemplate = {
      coloring_tips: "涂色技巧相关内容",
      coloring_challenges: "涂色挑战相关内容",
      coloring_benefits: "填色书好处相关内容"
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 发送进度
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: items.length,
        message: `正在为"${item.title}"生成文案...`
      })}\n\n`)

      try {
        // 生成详细内容文案
        const detailedContent = await generateDetailedContent(
          keyword,
          item.title,
          item.prompt,
          contentTemplate,
          model
        )

        // 发送文案结果
        res.write(`data: ${JSON.stringify({
          type: 'content_generated',
          id: item.id,
          content: detailedContent,
          stepProgress: i + 1,
          totalItems: items.length
        })}\n\n`)

        console.log(`✅ 文案生成完成 ${i + 1}/${items.length}: ${item.title}`)

      } catch (contentError) {
        console.error(`生成第${i + 1}条文案失败:`, contentError)

        // 使用默认内容
        const defaultContent = generateDefaultContent(keyword, item.title)

        res.write(`data: ${JSON.stringify({
          type: 'content_generated',
          id: item.id,
          content: defaultContent,
          stepProgress: i + 1,
          totalItems: items.length,
          warning: `第${i + 1}条文案生成失败，使用默认内容`
        })}\n\n`)
      }

      // 添加延迟
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 发送完成消息
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      message: `文案生成完成！共生成${items.length}条文案`,
      successCount: items.length,
      totalCount: items.length
    })}\n\n`)

    res.end()
  } catch (error) {
    console.error('生成文案错误:', error)
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: `生成文案出错: ${error.message}`
    })}\n\n`)
    res.end()
  }
})

// 保存内容的API
app.post('/api/save-content', async (req, res) => {
  try {
    const { keyword, description, model, contents } = req.body

    if (!contents || contents.length === 0) {
      return res.status(400).json({ error: '没有内容可保存' })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `content_${keyword}_${timestamp}.json`
    const filepath = path.join(storageDir, filename)

    const saveData = {
      keyword,
      description,
      model,
      generatedAt: new Date().toISOString(),
      totalCount: contents.length,
      successCount: contents.length,
      contents: contents
    }

    await fs.writeFile(filepath, JSON.stringify(saveData, null, 2), 'utf8')
    console.log(`📁 已保存内容到: ${filepath}`)

    res.json({
      success: true,
      message: '内容保存成功',
      filename: filename,
      filepath: filepath
    })
  } catch (error) {
    console.error('保存内容错误:', error)
    res.status(500).json({ error: '保存内容失败: ' + error.message })
  }
})

// 生成图片的API
app.post('/api/generate-images', async (req, res) => {
  const { contents } = req.body

  // 设置流式响应
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*',
  })

  try {
    for (const item of contents) {
      const imagePath = await generateSingleImage(item.prompt, item.id)

      // 发送流式数据
      res.write(`data: ${JSON.stringify({
        type: 'image',
        id: item.id,
        imagePath: imagePath
      })}\n\n`)

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    res.end()
  } catch (error) {
    console.error('生成图片错误:', error)
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message
    })}\n\n`)
    res.end()
  }
})

// 导出Excel的API
app.post('/api/export-excel', async (req, res) => {
  const { contents } = req.body

  try {
    // 准备Excel数据
    const excelData = contents.map((item, index) => ({
      '序号': index + 1,
      '标题': item.title || '',
      '简要描述': item.description || '',
      '图片生成Prompt': item.prompt || '',
      '内容文案': item.content || '',
      '图片路径': item.imagePath || '',
      '创建时间': new Date().toLocaleString('zh-CN')
    }))

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // 设置列宽
    const colWidths = [
      { wch: 8 },   // 序号
      { wch: 30 },  // 标题
      { wch: 40 },  // 简要描述
      { wch: 50 },  // Prompt
      { wch: 80 },  // 内容文案
      { wch: 30 },  // 图片路径
      { wch: 20 }   // 创建时间
    ]
    worksheet['!cols'] = colWidths

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, '涂色书内容')

    // 生成Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="涂色书内容_${new Date().toISOString().slice(0, 10)}.xlsx"`)

    res.send(excelBuffer)
  } catch (error) {
    console.error('导出Excel错误:', error)
    res.status(500).json({ error: error.message })
  }
})

// 第一步：生成多个不同主题的标题和prompt
async function generateThemes(keyword, description, count, model) {
  console.log(`🎯 开始生成${count}个基于"${keyword}"的不同主题...`)

  // 如果配置了DeepSeek API，尝试调用
  if (process.env.DEEPSEEK_API_KEY && model.includes('deepseek')) {
    try {
      return await callDeepSeekForThemes(keyword, description, count, model)
    } catch (error) {
      console.warn('调用DeepSeek API生成主题失败，使用模拟数据:', error.message)
    }
  }

  // 生成模拟主题数据
  const themes = []
  const themeVariations = [
    '奇幻世界', '花园冒险', '梦幻色彩', '艺术创作', '自然探索',
    '魔法时光', '创意空间', '美丽时刻', '童话故事', '缤纷世界'
  ]

  for (let i = 0; i < count; i++) {
    const variation = themeVariations[i % themeVariations.length]
    themes.push({
      title: `${keyword}的${variation} - 第${i + 1}章`,
      description: `精美的${keyword}主题涂色页，${description ? description + '，' : ''}融合${variation}元素的创意设计`,
      prompt: `详细的${keyword}涂色页，${description ? description + '，' : ''}${variation}主题，复杂的线条艺术，黑白轮廓线，适合涂色，艺术构图，高细节度`
    })
  }

  return themes
}

// 第二步：生成详细内容文案
async function generateDetailedContent(keyword, title, prompt, contentTemplate, model) {
  console.log(`📝 为"${title}"生成详细内容文案...`)

  // 如果配置了DeepSeek API，尝试调用
  if (process.env.DEEPSEEK_API_KEY && model.includes('deepseek')) {
    try {
      return await callDeepSeekForDetailedContent(keyword, title, prompt, contentTemplate, model)
    } catch (error) {
      console.warn('调用DeepSeek API生成详细内容失败，使用默认内容:', error.message)
    }
  }

  // 生成默认详细内容
  return generateDefaultContent(keyword, title)
}

// 生成默认内容文案
function generateDefaultContent(keyword, title) {
  return `【${title}】

🎨 涂色技巧：
在给这个${keyword}主题上色时，建议从浅色开始，逐渐加深颜色层次。可以使用渐变技法来表现光影效果，让${keyword}更加生动立体。注意色彩的冷暖对比，这样能让作品更有视觉冲击力。

🎯 涂色挑战：
尝试使用不同的涂色工具，如彩色铅笔、水彩笔或马克笔，体验不同的质感效果。挑战自己使用非传统色彩，比如用蓝色或紫色来表现${keyword}，创造独特的艺术效果。

💡 填色书的好处：
通过${keyword}主题的涂色活动，可以有效放松心情，减轻压力。这种专注的创作过程有助于提高注意力和手眼协调能力，同时激发创造力和想象力。对于不同年龄段的人都有很好的益处。`
}

// 调用DeepSeek API生成主题
async function callDeepSeekForThemes(keyword, description, count, model) {
  const prompt = `请基于关键词"${keyword}"${description ? '和描述"' + description + '"' : ''}，生成${count}个不同主题的涂色页概念。

每个主题都应该：
1. 围绕${keyword}这个核心元素
2. 有不同的创意角度和主题变化
3. 适合制作成涂色页

请以JSON数组格式返回，每个对象包含：
- title: 有创意的标题
- description: 简短描述（30字以内）
- prompt: 详细的中文图像生成描述，用于AI生成涂色页图片

示例格式：
[
  {
    "title": "花园中的蝴蝶舞会",
    "description": "蝴蝶在花丛中翩翩起舞的美妙场景",
    "prompt": "详细的蝴蝶在花园中翩翩起舞的涂色页，复杂的线条艺术，花朵和蝴蝶，黑白轮廓线，适合涂色"
  }
]`

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的涂色书设计师，擅长创作各种主题的创意涂色页概念。请确保返回有效的JSON格式。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = response.data.choices[0].message.content

    // 尝试解析JSON
    try {
      const themes = JSON.parse(result)
      if (Array.isArray(themes) && themes.length > 0) {
        return themes.slice(0, count) // 确保返回正确数量
      }
    } catch (parseError) {
      // 尝试提取JSON数组部分
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const themes = JSON.parse(jsonMatch[0])
        if (Array.isArray(themes)) {
          return themes.slice(0, count)
        }
      }
    }

    throw new Error('无法解析DeepSeek返回的主题JSON格式')
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message)
    throw error
  }
}

// 调用DeepSeek API生成详细内容
async function callDeepSeekForDetailedContent(keyword, title, prompt, contentTemplate, model) {
  const contentPrompt = `基于以下信息生成涂色书的详细内容文案：

关键词：${keyword}
标题：${title}
图片描述：${prompt}

请生成包含以下三个部分的内容：

1. 涂色技巧：针对这个${keyword}主题的具体涂色建议和技巧
2. 涂色挑战：适合这个主题的有趣挑战和创意建议  
3. 填色书的好处：涂色这个主题对身心的益处

请用温馨、专业的语调，内容要实用且有启发性。每个部分2-3句话即可。

返回格式为纯文本，用emoji图标分隔各部分：
🎨 涂色技巧：...
🎯 涂色挑战：...
💡 填色书的好处：...`

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的涂色书内容创作专家，擅长为不同主题创作实用且有启发性的涂色指导内容。'
        },
        {
          role: 'user',
          content: contentPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    return response.data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message)
    throw error
  }
}

// 生成单个内容的函数（保留为兼容性，现在主要用两步骤生成）
async function generateSingleContent(keyword, description, template, model, index) {
  // 根据模型类型生成不同风格的模拟数据
  let mockContent

  if (model.includes('deepseek')) {
    // DeepSeek风格的内容
    mockContent = {
      title: `探索${keyword}的奇妙世界 - 第${index}章`,
      description: `发现${keyword}的魅力！${description ? description + '，' : ''}专为创意爱好者设计的精彩涂色体验。`,
      prompt: `详细的${keyword}涂色页，${description ? description + '，' : ''}复杂的线条艺术，曼陀罗风格图案，适合成人和儿童涂色，黑白线条绘画，高细节度，艺术构图`,
      content: generateContentFromTemplate(template, keyword, description, 'deepseek')
    }
  } else {
    // 通用模拟数据
    mockContent = {
      title: `${keyword}涂色页 - 创意设计${index}`,
      description: `精美的${keyword}涂色页，${description ? description + '，' : ''}适合各年龄段使用，培养创造力和专注力。`,
      prompt: `详细的${keyword}主题涂色页，${description ? description + '，' : ''}线条艺术风格，黑白轮廓，适合涂色，清晰线条，无阴影，简洁背景`,
      content: generateContentFromTemplate(template, keyword, description)
    }
  }

  // 如果配置了真实的API密钥，可以在这里调用大模型
  if (process.env.OPENAI_API_KEY && model.includes('gpt')) {
    try {
      const result = await callOpenAIAPI(keyword, description, template, model)
      return ensureContentIsString(result)
    } catch (error) {
      console.warn('调用OpenAI API失败，使用模拟数据:', error.message)
    }
  }

  // 调用DeepSeek API
  if (process.env.DEEPSEEK_API_KEY && model.includes('deepseek')) {
    try {
      const result = await callDeepSeekAPI(keyword, description, template, model)
      return ensureContentIsString(result)
    } catch (error) {
      console.warn('调用DeepSeek API失败，使用模拟数据:', error.message)
    }
  }

  return ensureContentIsString(mockContent)
}

// 确保content字段是字符串的辅助函数
function ensureContentIsString(data) {
  if (data && data.content && typeof data.content === 'object') {
    // 如果content是对象，将其转换为字符串
    if (data.content.coloring_tips || data.content.challenges || data.content.benefits) {
      let contentText = ''
      if (data.content.coloring_tips) {
        contentText += `🎨 涂色技巧：\n${data.content.coloring_tips}\n\n`
      }
      if (data.content.challenges) {
        contentText += `🎯 挑战：\n${data.content.challenges}\n\n`
      }
      if (data.content.benefits) {
        contentText += `💡 益处：\n${data.content.benefits}`
      }
      data.content = contentText
    } else {
      // 如果是其他类型的对象，转换为JSON字符串
      data.content = JSON.stringify(data.content, null, 2)
    }
  }
  return data
}

// 根据模板生成内容的函数
function generateContentFromTemplate(template, keyword, description, modelType) {
  if (!template) {
    if (modelType === 'deepseek') {
      return `【DeepSeek AI生成】

关于${keyword}涂色页的专业指导：

🎨 涂色技巧：
在给${keyword}上色时，建议采用层次渐进的方式。首先确定主色调，然后用相近色系进行深浅变化。${description ? `特别是${description}的部分，` : ''}可以运用对比色突出重点区域。

🎯 创意提升：
鼓励尝试不同的涂色技法，如点彩法、渐变法或混色技巧。这不仅能提高艺术表现力，还能增强专注力和耐心。

💡 教育价值：
通过${keyword}涂色活动，可以培养观察能力、手眼协调性和审美情趣，是寓教于乐的绝佳方式。`
    } else {
      return `关于${keyword}涂色页的内容正在生成中...`
    }
  }

  // 简单的模板替换
  let content = template
    .replace(/蝴蝶/g, keyword)
    .replace(/马赛克瓷砖纹理的/g, description ? `${description}的` : '')

  // 如果是DeepSeek模型，增加更丰富的内容
  if (modelType === 'deepseek') {
    content += `\n\n【DeepSeek增强内容】\n✨ 这个${keyword}涂色页融合了现代设计理念，既保持了传统涂色的乐趣，又加入了创新元素，让每一次涂色都成为独特的艺术创作体验。`
  }

  return content
}

// 构建专业涂色页prompt
function buildProfessionalColoringPagePrompt(userPrompt) {
  const config = COLORING_PAGE_CONFIG

  // 构建完整的专业prompt
  const professionalPrompt = `${config.baseInstructions}

MAIN SUBJECT: ${userPrompt}

ARTWORK SPECIFICATIONS:
- ${config.artworkRules.background}
- ${config.artworkRules.lines}
- ${config.artworkRules.border}

ADDITIONAL REQUIREMENTS:
- ${config.textLabel}
- ${config.outputRequirements}

STYLE GUIDELINES:
- Create a peaceful, engaging, and suitable-for-all-ages design
- Include interesting details that will be fun to color
- Ensure all elements are clearly defined with bold black outlines
- Make sure the design is not too complex for children but engaging enough for adults
- Focus on creating a therapeutic and relaxing coloring experience

TECHNICAL SPECIFICATIONS:
- Image size: 8.5×8.5 inches
- Resolution: High quality for printing
- Format: Black and white line art only
- Line weight: Consistent 1mm thick lines throughout
- No gradients, shadows, or gray tones
- Pure white background

Please generate a professional-quality coloring page that meets all these specifications.`

  return professionalPrompt
}

// 调用KIEAI图片生成API
async function callKIEAIImageGeneration(prompt) {
  const data = {
    prompt: prompt,
    size: "1:1", // 默认使用1:1比例
    nVariants: 1,
    isEnhance: false,
    uploadCn: false,
    enableFallback: true // 启用托底机制
  }

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/generate`,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    data: JSON.stringify(data)
  }

  try {
    console.log('🎨 调用KIEAI图片生成API:', prompt)
    const response = await axios.request(config)
    console.log('📸 KIEAI API响应:', response.data)

    // 根据响应码处理不同的情况
    switch (response.data.code) {
      case 200:
        return response.data.data.taskId
      case 401:
        throw new Error('KIEAI API未授权 - 请检查认证凭据')
      case 402:
        throw new Error('KIEAI API积分不足')
      case 422:
        throw new Error('KIEAI API参数错误')
      case 429:
        throw new Error('KIEAI API请求限制')
      case 455:
        throw new Error('KIEAI API服务不可用')
      case 500:
        throw new Error('KIEAI API服务器错误')
      default:
        throw new Error(`KIEAI API未知错误 - 状态码: ${response.data.code}`)
    }
  } catch (error) {
    console.error('KIEAI API调用失败:', error)
    throw error
  }
}

// 查询KIEAI任务状态
async function getKIEAITaskStatus(taskId) {
  const config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/record-info?taskId=${taskId}`,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    }
  }

  try {
    const response = await axios.request(config)

    switch (response.data.code) {
      case 200:
        return response.data.data
      case 401:
        throw new Error('KIEAI API未授权')
      case 404:
        throw new Error('任务不存在')
      default:
        throw new Error(`查询任务状态失败 - 状态码: ${response.data.code}`)
    }
  } catch (error) {
    console.error('查询KIEAI任务状态失败:', error)
    throw error
  }
}

// 下载图片并保存到本地
async function downloadAndSaveImage(imageUrl, filename) {
  try {
    console.log(`📥 开始下载图片: ${imageUrl}`)

    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'stream',
      timeout: 30000 // 30秒超时
    })

    const imagePath = path.join(imagesDir, filename)
    const writer = fs.createWriteStream(imagePath)

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ 图片下载完成: ${filename}`)
        resolve(`./images/${filename}`)
      })
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('下载图片失败:', error)
    throw error
  }
}

// 生成单个图片的函数
async function generateSingleImage(prompt, id) {
  const filename = `image_${id}_${Date.now()}.png`

  // 如果配置了KIEAI API，尝试调用真实的图片生成
  if (KIEAI_AUTH_TOKEN && KIEAI_AUTH_TOKEN !== '27e443bd81969aefddc051bd78fa0a01') {
    try {
      console.log(`🎨 为ID: ${id} 生成专业涂色页图片`)
      console.log(`📝 原始prompt: ${prompt}`)

      // 1. 构建专业涂色页prompt
      const professionalPrompt = buildProfessionalColoringPagePrompt(prompt)
      console.log(`🔧 专业prompt已构建，长度: ${professionalPrompt.length} 字符`)

      // 2. 调用KIEAI生成图片
      const taskId = await callKIEAIImageGeneration(professionalPrompt)
      console.log(`📋 获得任务ID: ${taskId}`)

      // 3. 轮询任务状态（最多等待2分钟）
      const maxAttempts = 24 // 每5秒查询一次，最多2分钟
      let attempts = 0

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // 等待5秒
        attempts++

        console.log(`🔍 查询任务状态 (${attempts}/${maxAttempts}): ${taskId}`)
        const taskStatus = await getKIEAITaskStatus(taskId)

        if (taskStatus.status === 'SUCCESS' && taskStatus.progress === '1.00') {
          console.log('🎉 专业涂色页生成完成！')

          if (taskStatus.response && taskStatus.response.resultUrls && taskStatus.response.resultUrls.length > 0) {
            const imageUrl = taskStatus.response.resultUrls[0]

            // 4. 下载图片到本地
            return await downloadAndSaveImage(imageUrl, filename)
          } else {
            throw new Error('API返回成功但没有图片URL')
          }
        } else if (taskStatus.status === 'GENERATE_FAILED' || taskStatus.status === 'CREATE_TASK_FAILED') {
          throw new Error(`图片生成失败: ${taskStatus.status}`)
        } else {
          console.log(`⏳ 任务状态: ${taskStatus.status}, 进度: ${taskStatus.progress || '0%'}`)
        }
      }

      throw new Error('图片生成超时（2分钟）')

    } catch (error) {
      console.warn('KIEAI图片生成失败，使用占位符:', error.message)
      // 如果KIEAI失败，降级到占位符
    }
  }

  // 降级处理：创建占位符文件
  console.log(`📝 创建占位符图片: ${filename}`)
  const imagePath = path.join(imagesDir, filename)
  const placeholderContent = `模拟生成的图片文件\nPrompt: ${prompt}\n生成时间: ${new Date().toISOString()}\nID: ${id}`
  await fs.writeFile(imagePath, placeholderContent)

  return `./images/${filename}`
}

// 调用OpenAI API的函数（如果配置了API密钥）
async function callOpenAIAPI(keyword, description, template, model) {
  const prompt = `基于以下信息生成涂色书内容：
关键词: ${keyword}
描述: ${description || '无'}
模板: ${template}

请以JSON格式返回包含以下字段的内容：
- title: 标题
- description: 简要描述
- prompt: 用于生成涂色页图片的中文描述
- content: 基于模板生成的详细内容

请确保内容适合涂色书网站使用。`

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = response.data.choices[0].message.content
    return JSON.parse(result)
  } catch (error) {
    console.error('OpenAI API调用失败:', error.response?.data || error.message)
    throw error
  }
}

// 调用DeepSeek API的函数
async function callDeepSeekAPI(keyword, description, template, model) {
  const prompt = `基于以下信息生成涂色书内容：
关键词: ${keyword}
描述: ${description || '无'}
模板: ${template}

请以JSON格式返回包含以下字段的内容：
- title: 标题（要求创意且吸引人）
- description: 简要描述（50字以内，突出特色）
- prompt: 用于生成涂色页图片的英文prompt（详细描述图像内容，适合AI图像生成）
- content: 基于模板生成的详细内容，必须是纯文本字符串（要求专业且实用）

重要：content字段必须是一个字符串，不能是对象或数组。
请确保内容适合涂色书网站使用，风格要适合儿童和成人用户。`

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的涂色书内容创作专家，擅长为各种主题创作有趣且富有教育意义的涂色书内容。请确保返回的JSON格式正确，特别是content字段必须是字符串类型。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    const result = response.data.choices[0].message.content

    // 尝试解析JSON，如果失败则提取JSON部分
    try {
      const parsedResult = JSON.parse(result)

      // 确保content字段是字符串
      if (parsedResult.content && typeof parsedResult.content === 'object') {
        // 如果content是对象，将其转换为字符串
        if (parsedResult.content.coloring_tips || parsedResult.content.challenges || parsedResult.content.benefits) {
          let contentText = ''
          if (parsedResult.content.coloring_tips) {
            contentText += `🎨 涂色技巧：\n${parsedResult.content.coloring_tips}\n\n`
          }
          if (parsedResult.content.challenges) {
            contentText += `🎯 挑战：\n${parsedResult.content.challenges}\n\n`
          }
          if (parsedResult.content.benefits) {
            contentText += `💡 益处：\n${parsedResult.content.benefits}`
          }
          parsedResult.content = contentText
        } else {
          // 如果是其他类型的对象，转换为JSON字符串
          parsedResult.content = JSON.stringify(parsedResult.content, null, 2)
        }
      }

      return parsedResult
    } catch (parseError) {
      // 如果直接解析失败，尝试提取JSON部分
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])

        // 同样的处理逻辑
        if (parsedResult.content && typeof parsedResult.content === 'object') {
          if (parsedResult.content.coloring_tips || parsedResult.content.challenges || parsedResult.content.benefits) {
            let contentText = ''
            if (parsedResult.content.coloring_tips) {
              contentText += `🎨 涂色技巧：\n${parsedResult.content.coloring_tips}\n\n`
            }
            if (parsedResult.content.challenges) {
              contentText += `🎯 挑战：\n${parsedResult.content.challenges}\n\n`
            }
            if (parsedResult.content.benefits) {
              contentText += `💡 益处：\n${parsedResult.content.benefits}`
            }
            parsedResult.content = contentText
          } else {
            parsedResult.content = JSON.stringify(parsedResult.content, null, 2)
          }
        }

        return parsedResult
      }
      throw new Error('无法解析DeepSeek返回的JSON格式')
    }
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message)
    throw error
  }
}

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '涂色书内容生成器后端服务运行正常' })
})

// 启动服务器
app.listen(3002, () => {
  console.log(`服务器运行在端口 3002`)
  console.log(`健康检查: http://localhost:3002/api/health`)
}) 