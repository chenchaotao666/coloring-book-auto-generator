const express = require('express')
const cors = require('cors')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const { v4: uuidv4 } = require('uuid')
require('dotenv').config()

// 数据库连接
const { testConnection } = require('./database')

// 路由导入
const categoriesRouter = require('./routes/categories')
const tagsRouter = require('./routes/tags')
const imagesRouter = require('./routes/images')
const internationalizationRouter = require('./routes/internationalization')

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

  // 输出要求
  outputRequirements: "100% vector-friendly, high-contrast line art suitable for printing and coloring."
}

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 静态文件服务 - 提供图片访问
app.use('/images', express.static(path.join(__dirname, '../images')))

// 数据库API路由
app.use('/api/categories', categoriesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/images', imagesRouter)
app.use('/api/db-images', imagesRouter)
app.use('/api/internationalization', internationalizationRouter)

// 创建必要的目录
const storageDir = path.join(__dirname, '../storage')
const imagesDir = path.join(__dirname, '../images')

fs.ensureDirSync(storageDir)
fs.ensureDirSync(imagesDir)

// 图片生成任务管理
const imageGenerationTasks = new Map() // 存储正在进行的任务
const taskProgress = new Map() // 存储任务进度

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

// 查询图片生成进度的API
app.get('/api/image-progress/:taskId', (req, res) => {
  const { taskId } = req.params

  const progress = taskProgress.get(taskId)
  if (!progress) {
    return res.status(404).json({ error: '任务不存在' })
  }

  res.json(progress)
})

// 暂停图片生成的API
app.post('/api/pause-image-generation/:taskId', (req, res) => {
  const { taskId } = req.params

  const task = imageGenerationTasks.get(taskId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  task.paused = true

  // 更新进度状态
  const progress = taskProgress.get(taskId)
  if (progress) {
    progress.status = 'paused'
    progress.message = '生成已暂停'
    taskProgress.set(taskId, progress)
  }

  res.json({ success: true, message: '任务已暂停' })
})

// 恢复图片生成的API
app.post('/api/resume-image-generation/:taskId', (req, res) => {
  const { taskId } = req.params

  const task = imageGenerationTasks.get(taskId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  task.paused = false

  // 更新进度状态
  const progress = taskProgress.get(taskId)
  if (progress) {
    progress.status = 'running'
    progress.message = '生成已恢复'
    taskProgress.set(taskId, progress)
  }

  res.json({ success: true, message: '任务已恢复' })
})

// 生成图片的API（重新设计为并发批量生成）
app.post('/api/generate-images', async (req, res) => {
  const { contents } = req.body
  const taskId = uuidv4()
  const BATCH_SIZE = 5 // 每批最多5张图片

  // 立即返回任务ID
  res.json({
    success: true,
    taskId: taskId,
    message: '图片生成任务已创建',
    totalImages: contents.length,
    batchSize: BATCH_SIZE
  })

  // 初始化任务状态
  const taskInfo = {
    taskId: taskId,
    paused: false,
    contents: contents,
    currentBatch: 0,
    totalBatches: Math.ceil(contents.length / BATCH_SIZE),
    results: {}
  }

  imageGenerationTasks.set(taskId, taskInfo)

  // 初始化进度
  const progress = {
    taskId: taskId,
    status: 'running',
    message: '准备开始生成图片...',
    totalImages: contents.length,
    completedImages: 0,
    currentBatch: 0,
    totalBatches: taskInfo.totalBatches,
    images: {}
  }

  // 为每张图片初始化进度状态
  contents.forEach(item => {
    progress.images[item.id] = {
      id: item.id,
      title: item.title || `图片 ${item.id}`,
      imageRatio: item.imageRatio || '1:1',
      status: 'pending',
      progress: 0,
      message: '等待生成...',
      imagePath: null,
      error: null
    }
  })

  taskProgress.set(taskId, progress)

  // 异步处理图片生成
  generateImagesConcurrently(taskId)
})

// 并发生成图片的函数
async function generateImagesConcurrently(taskId) {
  const task = imageGenerationTasks.get(taskId)
  const progress = taskProgress.get(taskId)

  if (!task || !progress) {
    console.error('任务不存在:', taskId)
    return
  }

  const { contents } = task
  const BATCH_SIZE = 5

  try {
    // 分批处理
    for (let batchIndex = 0; batchIndex < task.totalBatches; batchIndex++) {
      // 检查是否被暂停
      if (task.paused) {
        progress.status = 'paused'
        progress.message = '生成已暂停'
        taskProgress.set(taskId, progress)
        console.log(`任务 ${taskId} 已暂停`)
        return
      }

      const startIndex = batchIndex * BATCH_SIZE
      const endIndex = Math.min(startIndex + BATCH_SIZE, contents.length)
      const batch = contents.slice(startIndex, endIndex)

      progress.currentBatch = batchIndex + 1
      progress.message = `正在生成第 ${batchIndex + 1}/${task.totalBatches} 批图片...`
      taskProgress.set(taskId, progress)

      console.log(`开始生成第 ${batchIndex + 1} 批图片 (${batch.length} 张)`)

      // 并发生成当前批次的图片
      const batchPromises = batch.map(async (item) => {
        try {
          // 更新单张图片状态为开始生成
          progress.images[item.id].status = 'generating'
          progress.images[item.id].message = '正在生成...'
          taskProgress.set(taskId, progress)

          const imagePath = await generateSingleImage(item.prompt, item.id, item.imageRatio || '1:1', (imageProgress) => {
            // 更新单张图片进度
            const currentProgress = taskProgress.get(taskId)
            if (currentProgress && currentProgress.images[item.id]) {
              currentProgress.images[item.id].progress = imageProgress
              currentProgress.images[item.id].message = `生成进度: ${imageProgress}%`
              taskProgress.set(taskId, currentProgress)
            }
          })

          // 生成成功
          const currentProgress = taskProgress.get(taskId)
          if (currentProgress) {
            currentProgress.images[item.id].status = 'completed'
            currentProgress.images[item.id].progress = 100
            currentProgress.images[item.id].message = '生成完成'
            currentProgress.images[item.id].imagePath = imagePath
            currentProgress.completedImages++
            taskProgress.set(taskId, currentProgress)
          }

          task.results[item.id] = imagePath
          return { success: true, id: item.id, imagePath }

        } catch (error) {
          console.error(`生成图片失败 (ID: ${item.id}):`, error.message)

          // 生成失败
          const currentProgress = taskProgress.get(taskId)
          if (currentProgress) {
            currentProgress.images[item.id].status = 'error'
            currentProgress.images[item.id].message = `生成失败: ${error.message}`
            currentProgress.images[item.id].error = error.message
            taskProgress.set(taskId, currentProgress)
          }

          return { success: false, id: item.id, error: error.message }
        }
      })

      // 等待当前批次完成
      await Promise.all(batchPromises)

      console.log(`第 ${batchIndex + 1} 批图片生成完成`)

      // 批次间延迟，避免过载
      if (batchIndex < task.totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 所有批次完成
    const finalProgress = taskProgress.get(taskId)
    if (finalProgress) {
      finalProgress.status = 'completed'
      finalProgress.message = `图片生成完成！成功生成 ${finalProgress.completedImages}/${finalProgress.totalImages} 张图片`
      taskProgress.set(taskId, finalProgress)
    }

    console.log(`任务 ${taskId} 完成`)

  } catch (error) {
    console.error(`任务 ${taskId} 失败:`, error)
    const finalProgress = taskProgress.get(taskId)
    if (finalProgress) {
      finalProgress.status = 'error'
      finalProgress.message = `生成失败: ${error.message}`
      taskProgress.set(taskId, finalProgress)
    }
  }
}

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
async function callKIEAIImageGeneration(prompt, imageRatio = '1:1') {
  // 简化并优化请求参数，符合官方文档规范
  const data = {
    prompt: prompt,
    size: imageRatio, // 使用传入的图片比例
    nVariants: 1,
    isEnhance: false,
    uploadCn: false,
    enableFallback: true
  }

  console.log('🎨 KIEAI图片生成API参数:', data)

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${KIEAI_API_URL}/gpt4o-image/generate`, // 确保URL正确
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${KIEAI_AUTH_TOKEN}`
    },
    data: JSON.stringify(data),
    timeout: 120000, // 增加到2分钟超时，因为图片生成可能需要更长时间
    validateStatus: function (status) {
      return status < 500; // 将500以下的状态码都视为成功
    }
  }

  // 重试机制 - 减少重试次数，因为图片生成通常第一次就能成功
  const maxRetries = 2
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🎨 调用KIEAI图片生成API (尝试 ${attempt}/${maxRetries})`)
      console.log(`📝 Prompt长度: ${prompt.length} 字符`)

      const response = await axios.request(config)
      console.log('📸 KIEAI API响应状态:', response.status)
      console.log('📸 KIEAI API响应数据:', JSON.stringify(response.data, null, 2))

      // 检查HTTP状态码
      if (response.status >= 400) {
        throw new Error(`KIEAI API HTTP错误: ${response.status}`)
      }

      // 检查响应数据
      if (!response.data) {
        throw new Error('KIEAI API返回空响应')
      }

      // 处理实际的API响应格式 - 支持两种可能的格式
      if (response.data.msg === 'success' && response.data.data && response.data.data.taskId) {
        console.log('✅ 获得TaskID (msg格式):', response.data.data.taskId)
        return response.data.data.taskId
      } else if (response.data.code === 200 && response.data.data && response.data.data.taskId) {
        console.log('✅ 获得TaskID (code格式):', response.data.data.taskId)
        return response.data.data.taskId
      } else if (response.data.code) {
        // 处理错误码格式的响应
        switch (response.data.code) {
          case 200:
            if (response.data.data && response.data.data.taskId) {
              return response.data.data.taskId
            }
            throw new Error('API返回成功但没有taskId')
          case 401:
            throw new Error('KIEAI API未授权 - 请检查认证凭据')
          case 402:
            throw new Error('KIEAI API积分不足')
          case 422:
            throw new Error('KIEAI API参数错误 - 请检查prompt和其他参数')
          case 429:
            if (attempt < maxRetries) {
              console.log(`⏳ API请求限制，等待${attempt * 5}秒后重试...`)
              await new Promise(resolve => setTimeout(resolve, attempt * 5000))
              continue
            }
            throw new Error('KIEAI API请求限制')
          case 455:
            throw new Error('KIEAI API服务不可用')
          case 500:
            throw new Error('KIEAI API服务器错误')
          default:
            throw new Error(`KIEAI API未知错误 - 状态码: ${response.data.code}, 消息: ${response.data.message || '无'}`)
        }
      } else {
        throw new Error(`KIEAI API响应格式异常: ${JSON.stringify(response.data)}`)
      }
    } catch (error) {
      lastError = error
      console.error(`KIEAI API调用失败 (尝试 ${attempt}/${maxRetries}):`, error.message)

      if (attempt < maxRetries) {
        // 指数退避重试，但时间不要太长
        const delay = Math.min(3000 * attempt, 10000) // 最多等待10秒
        console.log(`⏳ ${delay}ms后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
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
    },
    timeout: 30000, // 30秒超时
    validateStatus: function (status) {
      return status < 500;
    }
  }

  // 重试机制 - 注意API频率限制：每个任务每秒最多3次查询
  const maxRetries = 2
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.request(config)

      // 检查HTTP状态码
      if (response.status >= 400) {
        throw new Error(`KIEAI API HTTP错误: ${response.status}`)
      }

      if (!response.data) {
        throw new Error('查询任务状态返回空响应')
      }

      // 处理实际的API响应格式 - 支持两种可能的格式
      if (response.data.msg === 'success') {
        if (response.data.data) {
          return response.data.data
        } else {
          throw new Error('任务不存在或已过期')
        }
      } else if (response.data.code) {
        // 处理错误码格式的响应
        switch (response.data.code) {
          case 200:
            if (response.data.data) {
              return response.data.data
            }
            throw new Error('API返回成功但没有任务数据')
          case 401:
            throw new Error('KIEAI API未授权')
          case 404:
            throw new Error('任务不存在')
          case 500:
            throw new Error('KIEAI API服务器错误')
          default:
            throw new Error(`查询任务状态失败 - 状态码: ${response.data.code}, 消息: ${response.data.message || '无'}`)
        }
      } else {
        throw new Error(`查询任务状态响应格式异常: ${JSON.stringify(response.data)}`)
      }
    } catch (error) {
      lastError = error
      console.error(`查询KIEAI任务状态失败 (尝试 ${attempt}/${maxRetries}):`, error.message)

      if (attempt < maxRetries) {
        // 遵守API频率限制：确保不超过每秒3次查询
        // 等待至少1秒后重试，避免触发频率限制
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  throw lastError
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
        resolve(`images/${filename}`)
      })
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('下载图片失败:', error)
    throw error
  }
}

// 生成单个图片的函数
async function generateSingleImage(prompt, id, imageRatio, progressCallback) {
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
      const taskId = await callKIEAIImageGeneration(professionalPrompt, imageRatio)
      console.log(`📋 获得任务ID: ${taskId}`)

      // 任务创建成功，等待API返回真实进度
      if (progressCallback) progressCallback(0)

      // 3. 轮询任务状态（最多等待5分钟，因为图片生成可能需要较长时间）
      const maxAttempts = 100 // 每5秒查询一次
      let attempts = 0

      while (attempts < maxAttempts) {
        // 前几次查询间隔短一些，后面逐渐延长
        const delay = attempts < 6 ? 3000 : (attempts < 12 ? 5000 : 8000)
        await new Promise(resolve => setTimeout(resolve, delay))
        attempts++

        console.log(`🔍 查询任务状态 (${attempts}/${maxAttempts}): ${taskId}`)

        // 轮询过程中不更新进度，等待API返回真实进度

        try {
          const taskStatus = await getKIEAITaskStatus(taskId)

          // 根据官方文档处理不同状态
          switch (taskStatus.status) {
            case 'SUCCESS':
              console.log('🎉 专业涂色页生成完成！')

              if (taskStatus.response && taskStatus.response.resultUrls && taskStatus.response.resultUrls.length > 0) {
                const imageUrl = taskStatus.response.resultUrls[0]
                console.log(`📸 图片URL: ${imageUrl}`)

                // 4. 下载图片到本地
                const result = await downloadAndSaveImage(imageUrl, filename)

                if (progressCallback) progressCallback(100)

                return result
              } else {
                throw new Error('生成成功但没有图片URL')
              }

            case 'GENERATING':
              console.log('🔍 taskStatus.progress: ', taskStatus.progress)
              const apiProgress = parseFloat(taskStatus.progress || '0') * 100
              console.log(`⏳ 正在生成中... 进度: ${apiProgress}%`)
              if (progressCallback) progressCallback(Math.round(apiProgress))
              break

            case 'CREATE_TASK_FAILED':
              throw new Error(`创建任务失败: ${taskStatus.errorMessage || '未知错误'}`)

            case 'GENERATE_FAILED':
              throw new Error(`生成失败: ${taskStatus.errorMessage || '未知错误'}`)

            default:
              console.log(`📊 任务状态: ${taskStatus.status}, 进度: ${taskStatus.progress || '0%'}`)
              if (taskStatus.errorMessage) {
                console.log(`⚠️ 错误信息: ${taskStatus.errorMessage}`)
              }
          }
        } catch (statusError) {
          console.warn(`查询任务状态失败 (${attempts}/${maxAttempts}):`, statusError.message)

          // 如果是网络错误且还有重试机会，继续尝试
          if (attempts < maxAttempts && (
            statusError.message.includes('ECONNRESET') ||
            statusError.message.includes('timeout') ||
            statusError.message.includes('ETIMEDOUT')
          )) {
            console.log('⏳ 网络错误，继续轮询...')
            continue
          }

          // 如果是其他错误或超过一半尝试次数，抛出异常
          if (attempts > maxAttempts / 2) {
            throw statusError
          }
        }
      }

      throw new Error('图片生成超时（5分钟）')

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

  if (progressCallback) progressCallback(100)

  return `images/${filename}`
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

// API配置检查端点
app.get('/api/config-check', (req, res) => {
  const configStatus = {
    server: {
      port: PORT,
      status: '正常运行'
    },
    apis: {
      kieai: {
        apiUrl: KIEAI_API_URL,
        authTokenConfigured: !!KIEAI_AUTH_TOKEN,
        authTokenValid: KIEAI_AUTH_TOKEN &&
          KIEAI_AUTH_TOKEN !== '27e443bd81969aefddc051bd78fa0a01' &&
          KIEAI_AUTH_TOKEN !== 'your_real_kieai_token_here',
        status: (KIEAI_AUTH_TOKEN &&
          KIEAI_AUTH_TOKEN !== '27e443bd81969aefddc051bd78fa0a01' &&
          KIEAI_AUTH_TOKEN !== 'your_real_kieai_token_here') ? '已配置' : '需要配置真实Token'
      },
      deepseek: {
        apiKeyConfigured: !!process.env.DEEPSEEK_API_KEY,
        status: process.env.DEEPSEEK_API_KEY ? '已配置' : '未配置'
      },
      openai: {
        apiKeyConfigured: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here',
        status: (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') ? '已配置' : '未配置'
      }
    },
    directories: {
      storage: fs.existsSync(storageDir),
      images: fs.existsSync(imagesDir)
    },
    recommendations: []
  }

  // 添加建议
  if (!configStatus.apis.kieai.authTokenValid) {
    configStatus.recommendations.push('配置有效的KIEAI API Token以启用真实图片生成')
  }

  if (!configStatus.apis.deepseek.apiKeyConfigured) {
    configStatus.recommendations.push('配置DeepSeek API Key以启用AI内容生成')
  }

  res.json(configStatus)
})

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '涂色书内容生成器后端服务运行正常' })
})

// 启动服务器
app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)

  // 测试数据库连接
  console.log('正在测试数据库连接...')
  await testConnection()
})