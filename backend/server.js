const express = require('express')
const cors = require('cors')
const fs = require('fs').promises
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

// 引入重构后的图片服务
const imageService = require('./services/imageColoringService')

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
const PORT = process.env.PORT || 3005

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb' }))

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

const ensureDirectories = async () => {
  try {
    await fs.mkdir(storageDir, { recursive: true })
    await fs.mkdir(imagesDir, { recursive: true })
    console.log('✅ 目录检查完成')
  } catch (error) {
    console.error('创建目录失败:', error)
  }
}

// 启动时检查目录
ensureDirectories()

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

// 生成图片的API（使用重构后的服务）
app.post('/api/generate-images', async (req, res) => {
  const { contents, apiType = 'gpt4o', model } = req.body
  const taskId = uuidv4()
  const BATCH_SIZE = 5

  // 立即返回任务ID
  res.json({
    success: true,
    taskId: taskId,
    message: '图片生成任务已创建',
    totalImages: contents.length,
    batchSize: BATCH_SIZE,
    apiType: apiType
  })

  // 初始化任务状态
  const taskInfo = {
    taskId: taskId,
    paused: false,
    contents: contents,
    apiType: apiType,
    model: model,
    currentBatch: 0,
    totalBatches: Math.ceil(contents.length / BATCH_SIZE),
    results: {}
  }

  imageGenerationTasks.set(taskId, taskInfo)

  // 初始化进度
  const progress = {
    taskId: taskId,
    status: 'running',
    message: `准备开始生成图片... (使用${apiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'} API)`,
    totalImages: contents.length,
    completedImages: 0,
    currentBatch: 0,
    totalBatches: taskInfo.totalBatches,
    apiType: apiType,
    images: {}
  }

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

// 并发生成图片的函数（使用重构后的服务）
async function generateImagesConcurrently(taskId) {
  const task = imageGenerationTasks.get(taskId)
  const progress = taskProgress.get(taskId)

  if (!task || !progress) {
    console.error('任务不存在:', taskId)
    return
  }

  try {
    const BATCH_SIZE = 5
    const contents = task.contents

    for (let batchIndex = 0; batchIndex < task.totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, contents.length)
      const batch = contents.slice(start, end)

      progress.currentBatch = batchIndex + 1
      progress.message = `正在处理第 ${progress.currentBatch}/${task.totalBatches} 批图片`
      taskProgress.set(taskId, progress)

      const batchPromises = batch.map(async (item) => {
        try {
          progress.images[item.id].status = 'generating'
          progress.images[item.id].message = '正在生成...'
          taskProgress.set(taskId, progress)

          // 使用重构后的图片服务
          const result = await imageService.completeImageGeneration({
            type: 'text-to-image',
            aiPrompt: item.aiPrompt,  // AI提示词（单张图片描述）
            text2imagePrompt: item.text2imagePrompt,  // 文生图提示词（通用描述）
            apiType: task.apiType,
            model: task.model,
            imageRatio: item.imageRatio || '1:1',
            progressCallback: (imageProgress) => {
              const currentProgress = taskProgress.get(taskId)
              if (currentProgress && currentProgress.images[item.id]) {
                currentProgress.images[item.id].progress = imageProgress
                currentProgress.images[item.id].message = `生成进度: ${imageProgress}%`
                taskProgress.set(taskId, currentProgress)
              }
            }
          })

          // 提取结果信息
          const imagePath = result.publicUrl || result.localPath || result
          const publicUrl = result.publicUrl || imagePath
          const filename = result.filename
          const storagePath = result.storagePath

          console.log(`✅ 任务 ${taskId} 图片生成完成`, {
            itemId: item.id,
            publicUrl: publicUrl,
            filename: filename,
            storagePath: storagePath
          })

          const currentProgress = taskProgress.get(taskId)
          if (currentProgress) {
            currentProgress.images[item.id].status = 'completed'
            currentProgress.images[item.id].progress = 100
            currentProgress.images[item.id].message = '生成完成'
            currentProgress.images[item.id].imagePath = publicUrl // 使用公网URL
            currentProgress.images[item.id].publicUrl = publicUrl // 新增字段
            currentProgress.images[item.id].filename = filename // 新增字段
            currentProgress.images[item.id].storagePath = storagePath // 新增字段
            currentProgress.completedImages++
            taskProgress.set(taskId, currentProgress)
          }

          task.results[item.id] = result
          return { success: true, id: item.id, imagePath: publicUrl, result: result }

        } catch (error) {
          console.error(`生成图片失败 (${item.id}):`, error.message)

          const currentProgress = taskProgress.get(taskId)
          if (currentProgress) {
            currentProgress.images[item.id].status = 'failed'
            currentProgress.images[item.id].progress = 100
            currentProgress.images[item.id].message = `生成失败: ${error.message}`
            currentProgress.images[item.id].error = error.message
            currentProgress.completedImages++
            taskProgress.set(taskId, currentProgress)
          }

          return { success: false, id: item.id, error: error.message }
        }
      })

      await Promise.all(batchPromises)

      if (batchIndex < task.totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const finalProgress = taskProgress.get(taskId)
    if (finalProgress) {
      finalProgress.status = 'completed'
      finalProgress.message = `图片生成完成 (${finalProgress.completedImages}/${finalProgress.totalImages})`
      taskProgress.set(taskId, finalProgress)
    }

    console.log(`✅ 任务 ${taskId} 图片生成完成`)

  } catch (error) {
    console.error(`任务 ${taskId} 处理失败:`, error)
    const finalProgress = taskProgress.get(taskId)
    if (finalProgress) {
      finalProgress.status = 'failed'
      finalProgress.message = `批量生成失败: ${error.message}`
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

  console.log('主题prompt: ', prompt)

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

  console.log('文案prompt: ', contentPrompt)

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
      storage: true, // 目录检查已在启动时完成
      images: true
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
app.listen(3006, async () => {
  console.log(`服务器运行在端口 3006`)
  console.log(`健康检查: http://localhost:3006/api/health`)

  // 测试数据库连接
  console.log('正在测试数据库连接...')
  await testConnection()
})