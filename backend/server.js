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
const usersRouter = require('./routes/users')
const postsRouter = require('./routes/posts')

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
const PORT = process.env.PORT || 3002

// 中间件 - 增强CORS配置
app.use(cors({
  origin: true,  // 允许所有来源，或者使用函数动态判断
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200 // 支持旧版浏览器
}))

// 预检请求处理
app.options('*', cors())

// Body解析中间件 - 注意顺序很重要
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' })) // 添加对form-data的支持

// 静态文件服务 - 提供图片访问
app.use('/images', express.static(path.join(__dirname, '../images')))

// 数据库API路由
app.use('/api/categories', categoriesRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/images', imagesRouter)
app.use('/api/db-images', imagesRouter)
app.use('/api/internationalization', internationalizationRouter)
app.use('/api/users', usersRouter)
app.use('/api/posts', postsRouter)

// 创建必要的目录
const storageDir = path.join(__dirname, '../storage')
const imagesDir = path.join(__dirname, '../images')

// 提取多语言字段的显示文本
const getDisplayText = (field, preferredLang = 'zh') => {
  if (!field) return ''

  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      return parsed[preferredLang] || parsed.en || Object.values(parsed)[0] || ''
    } catch {
      return field
    }
  }

  if (typeof field === 'object') {
    return field[preferredLang] || field.en || Object.values(field)[0] || ''
  }

  return String(field)
}

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
  const { keyword, description, count, model, themeTemplate, language = 'en' } = req.body

  console.log('🔍 生成主题API参数检查:')
  console.log('- keyword:', keyword)
  console.log('- description:', description)
  console.log('- count:', count)
  console.log('- model:', model)
  console.log('- language:', language)
  console.log('- themeTemplate:', typeof themeTemplate, themeTemplate?.substring ? themeTemplate.substring(0, 100) + '...' : themeTemplate)

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

    const themes = await generateThemes(keyword, description, count, model, themeTemplate, language)

    // 逐个发送生成的主题
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i]
      const contentId = `content_${Date.now()}_${i}`

      const contentItem = {
        id: contentId,
        index: i + 1,
        title: { [language]: theme.title },
        prompt: { [language]: theme.prompt },
        description: { [language]: theme.description || '' },
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

      console.log(`✅ 主题生成完成 ${i + 1}/${count}: ${getDisplayText(theme.title)}`)

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
  const { items, keyword, model, template, language = 'en' } = req.body

  console.log('🔍 生成文案API参数检查:')
  console.log('- keyword:', keyword)
  console.log('- model:', model)
  console.log('- language:', language)
  console.log('- template:', typeof template, template?.substring ? template.substring(0, 100) + '...' : template)
  console.log('- items count:', items?.length)

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

    // 使用用户传入的AI提示词模板
    const contentTemplate = template

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // 发送进度
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: items.length,
        message: `正在为"${getDisplayText(item.title)}"生成文案...`
      })}\n\n`)

      try {
        // 生成详细内容文案
        const detailedContent = await generateDetailedContent(
          keyword,
          item.title,
          item.prompt,
          contentTemplate,
          model,
          language
        )

        // 发送文案结果
        res.write(`data: ${JSON.stringify({
          type: 'content_generated',
          id: item.id,
          content: detailedContent,
          stepProgress: i + 1,
          totalItems: items.length
        })}\n\n`)

        console.log(`✅ 文案生成完成 ${i + 1}/${items.length}: ${getDisplayText(item.title)}`)

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
  const { contents, apiType = 'gpt4o', model, imageFormat = 'png', difficultyPrompt } = req.body
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
    imageFormat: imageFormat,
    difficultyPrompt: difficultyPrompt,
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
      title: getDisplayText(item.title) || `图片 ${item.id}`,
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
      progress.message = `正在批量生成图片...`
      taskProgress.set(taskId, progress)

      const batchPromises = batch.map(async (item) => {
        try {
          progress.images[item.id].status = 'generating'
          progress.images[item.id].message = '正在生成...'
          taskProgress.set(taskId, progress)

          // 使用重构后的图片服务
          const result = await imageService.completeImageGeneration({
            type: 'text-to-image',
            title: item.title,  // 图片标题（用于生成文件名）
            aiPrompt: item.aiPrompt,  // AI提示词（单张图片描述）
            text2imagePrompt: item.text2imagePrompt,  // 文生图提示词（通用描述）
            apiType: task.apiType,
            model: task.model,
            imageRatio: item.imageRatio || '1:1',
            imageFormat: task.imageFormat,
            difficultyPrompt: task.difficultyPrompt,
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
          console.error(`生成图片失败 (${item.id}):`, error)

          // 详细的错误分析和用户友好的错误消息
          let userFriendlyError = '生成失败'
          let errorType = 'unknown'
          
          if (error.message) {
            const errorMsg = error.message.toLowerCase()
            
            // API相关错误
            if (errorMsg.includes('api key') || errorMsg.includes('authentication') || errorMsg.includes('unauthorized')) {
              userFriendlyError = 'API密钥配置错误或已过期，请联系管理员'
              errorType = 'auth_error'
            } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit') || errorMsg.includes('billing')) {
              userFriendlyError = 'API配额不足或达到速率限制，请稍后重试'
              errorType = 'quota_error'
            } else if (errorMsg.includes('timeout') || errorMsg.includes('econnaborted')) {
              userFriendlyError = 'API请求超时，请检查网络连接或稍后重试'
              errorType = 'timeout_error'
            } else if (errorMsg.includes('network') || errorMsg.includes('econnrefused') || errorMsg.includes('enotfound')) {
              userFriendlyError = '网络连接失败，请检查网络设置'
              errorType = 'network_error'
            } else if (errorMsg.includes('unsupported') || errorMsg.includes('invalid format')) {
              userFriendlyError = '不支持的图片格式或参数设置'
              errorType = 'format_error'
            } else if (errorMsg.includes('content policy') || errorMsg.includes('safety')) {
              userFriendlyError = '内容不符合安全策略，请修改提示词'
              errorType = 'policy_error'
            } else if (errorMsg.includes('server error') || errorMsg.includes('internal error')) {
              userFriendlyError = '服务器内部错误，请稍后重试'
              errorType = 'server_error'
            } else {
              userFriendlyError = `生成失败: ${error.message}`
              errorType = 'api_error'
            }
          } else {
            userFriendlyError = '未知错误，请重试'
          }

          const currentProgress = taskProgress.get(taskId)
          if (currentProgress) {
            currentProgress.images[item.id].status = 'failed'
            currentProgress.images[item.id].progress = 100
            currentProgress.images[item.id].message = userFriendlyError
            currentProgress.images[item.id].error = error.message
            currentProgress.images[item.id].errorType = errorType
            currentProgress.completedImages++
            taskProgress.set(taskId, currentProgress)
          }

          return { success: false, id: item.id, error: error.message, userFriendlyError, errorType }
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
    
    // 批量任务级别的错误处理
    let batchErrorMessage = '批量生成失败'
    if (error.message) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('api key') || errorMsg.includes('authentication')) {
        batchErrorMessage = 'API密钥配置错误，请联系管理员'
      } else if (errorMsg.includes('quota') || errorMsg.includes('rate limit')) {
        batchErrorMessage = 'API配额不足，请稍后重试'
      } else if (errorMsg.includes('network')) {
        batchErrorMessage = '网络连接失败，请检查网络设置'
      } else {
        batchErrorMessage = `批量生成失败: ${error.message}`
      }
    }
    
    const finalProgress = taskProgress.get(taskId)
    if (finalProgress) {
      finalProgress.status = 'failed'
      finalProgress.message = batchErrorMessage
      taskProgress.set(taskId, finalProgress)
    }
  }
}

// 第一步：生成多个不同主题的标题和prompt
async function generateThemes(keyword, description, count, model, themeTemplate, language = 'en') {
  console.log(`🎯 开始生成${count}个基于"${keyword}"的不同主题...`)
  console.log('🔍 generateThemes 参数:')
  console.log('- language:', language)
  console.log('- themeTemplate:', typeof themeTemplate, themeTemplate?.substring ? themeTemplate.substring(0, 100) + '...' : themeTemplate)

  // 如果配置了DeepSeek API，尝试调用
  if (process.env.DEEPSEEK_API_KEY && model.includes('deepseek')) {
    try {
      return await callDeepSeekForThemes(keyword, description, count, model, themeTemplate, language)
    } catch (error) {
      console.warn('调用DeepSeek API生成主题失败，使用模拟数据:', error.message)
    }
  }

  // 生成模拟主题数据
  const themes = []
  const themeVariations = [
    'Fantasy World', 'Garden Adventure', 'Dreamy Colors', 'Artistic Creation', 'Nature Exploration',
    'Magic Time', 'Creative Space', 'Beautiful Moments', 'Fairy Tale', 'Colorful World'
  ]

  for (let i = 0; i < count; i++) {
    const variation = themeVariations[i % themeVariations.length]
    themes.push({
      title: `${keyword} ${variation} - Chapter ${i + 1}`,
      description: `Beautiful ${keyword} themed coloring page, ${description ? description + ', ' : ''}creative design incorporating ${variation} elements`,
      prompt: `Detailed ${keyword} coloring page, ${description ? description + ', ' : ''}${variation} theme, intricate line art, black and white outlines, suitable for coloring, artistic composition, high detail`
    })
  }

  return themes
}

// 第二步：生成详细内容文案
async function generateDetailedContent(keyword, title, prompt, contentTemplate, model, language = 'en') {
  console.log(`📝 为"${getDisplayText(title)}"生成详细内容文案...`)

  console.log('KEY + model + language: ', process.env.DEEPSEEK_API_KEY, model, language)

  // 如果配置了DeepSeek API，尝试调用
  if (process.env.DEEPSEEK_API_KEY && model.includes('deepseek')) {
    try {
      console.log('调用DeepSeek API生成详细内容...')
      return await callDeepSeekForDetailedContent(keyword, title, prompt, contentTemplate, model, language)
    } catch (error) {
      console.warn('调用DeepSeek API生成详细内容失败，使用默认内容:', error.message)
    }
  }

  // 生成默认详细内容
  return generateDefaultContent(keyword, title)
}

// 生成默认内容文案
function generateDefaultContent(keyword, title) {
  const displayTitle = getDisplayText(title)
  return `【${displayTitle}】

🎨 Coloring Tips:
When coloring this ${keyword} theme, it's recommended to start with light colors and gradually deepen the color layers. You can use gradient techniques to show light and shadow effects, making the ${keyword} more vivid and three-dimensional. Pay attention to the contrast between warm and cool colors to give your work more visual impact.

🎯 Coloring Challenges:
Try using different coloring tools such as colored pencils, watercolor pens, or markers to experience different texture effects. Challenge yourself to use non-traditional colors, such as blue or purple to represent ${keyword}, creating unique artistic effects.

💡 Benefits of Coloring Books:
Through ${keyword}-themed coloring activities, you can effectively relax your mood and reduce stress. This focused creative process helps improve attention and hand-eye coordination while stimulating creativity and imagination. It has great benefits for people of all ages.`
}

// 调用DeepSeek API生成主题
async function callDeepSeekForThemes(keyword, description, count, model, themeTemplate, language = 'en') {
  console.log('🔍 callDeepSeekForThemes 参数检查:')
  console.log('- keyword:', keyword)
  console.log('- description:', description)
  console.log('- count:', count)
  console.log('- model:', model)
  console.log('- language:', language)
  console.log('- themeTemplate:', typeof themeTemplate, themeTemplate?.substring ? themeTemplate.substring(0, 100) + '...' : themeTemplate)

  // 使用用户提供的模板作为AI提示词，如果没有则使用默认的
  let prompt = themeTemplate;

  if (!prompt || prompt.trim() === '') {
    prompt = `Based on the keyword "${keyword}"${description ? ' and description "' + description + '"' : ''}, generate ${count} different coloring page theme concepts.
Each theme should:
1. Focus on the core element of ${keyword}
2. Have different creative angles and theme variations
3. Be suitable for creating coloring pages

Please return in JSON array format, each object containing:
- title: Creative title
- description: Brief description (within 30 words)
- prompt: Detailed image generation description for AI to generate coloring pages

Example format:
[
  {
    "title": "Butterfly Garden Dance",
    "description": "Butterflies dancing gracefully in a blooming flower garden",
    "prompt": "Detailed coloring page of butterflies dancing in a garden, intricate line art, flowers and butterflies."
  }
]`;
  } else {
    // 替换用户模板中的占位符
    prompt = prompt
      .replace(/\$\{keyword\}/g, keyword)
      .replace(/\$\{description\}/g, description || '')
      .replace(/\$\{count\}/g, count)
      // 也支持不带$符号的占位符格式（向后兼容）
      .replace(/\{keyword\}/g, keyword)
      .replace(/\{description\}/g, description || '')
      .replace(/\{count\}/g, count);
  }

  console.log('主题prompt: ', prompt)

  // 根据语言选择配置system content - 控制生成内容的语言
  const systemContent = language === 'zh'
    ? '你是一个专业的涂色书设计师，擅长为各种主题创作创意涂色页概念。请确保返回有效的JSON格式。无论输入的提示词是什么语言，你都必须生成中文的标题、描述和提示词内容。特别注意：prompt字段必须是中文描述，用于描述涂色页的详细内容。'
    : 'You are a professional coloring book designer who excels at creating creative coloring page concepts for various themes. Please ensure to return valid JSON format. Regardless of what language the input prompt is in, you must generate all titles, descriptions, and prompt content in English.'

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemContent
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

    console.log('DeepSeek API返回的主题: ', result)

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
async function callDeepSeekForDetailedContent(keyword, title, prompt, contentTemplate, model, language = 'en') {
  console.log('🔍 callDeepSeekForDetailedContent 参数检查:')
  console.log('- keyword:', keyword)
  console.log('- title:', getDisplayText(title))
  console.log('- prompt:', prompt)
  console.log('- contentTemplate:', typeof contentTemplate, contentTemplate?.substring ? contentTemplate.substring(0, 100) + '...' : contentTemplate)
  console.log('- model:', model)
  console.log('- language:', language)

  // 处理prompt参数，确保它是字符串
  let promptText = ''
  if (typeof prompt === 'string') {
    promptText = prompt
  } else if (typeof prompt === 'object' && prompt !== null) {
    // 如果是对象，根据language参数获取对应语言的文本
    promptText = prompt[language] || prompt['zh'] || prompt['en'] || JSON.stringify(prompt)
  } else {
    promptText = String(prompt || '')
  }
  console.log('- 处理后的promptText:', promptText)

  // 使用用户提供的模板作为AI提示词，如果没有则使用默认的
  let contentPrompt = contentTemplate;

  if (!contentPrompt || contentPrompt.trim() === '') {
    // 根据语言参数选择默认模板
    const displayTitle = getDisplayText(title)

    contentPrompt = `Based on the following information, generate detailed content for a coloring book:
Keyword: ${keyword}
Title: ${displayTitle}
Image Description: ${promptText}

Please generate content for the following three sections:

1. Coloring Tips: Specific coloring suggestions and techniques for this ${keyword} theme
2. Coloring Challenges: Interesting challenges and creative suggestions suitable for this theme
3. Benefits of Coloring Books: Benefits to physical and mental health from coloring this theme

Please use a warm and professional tone, with practical and inspiring content. Each section should be 2-3 sentences.

Return format as plain text, separated by emoji icons:
<h2>🎨 Coloring Tips: ...</h2>
<h2>🎯 Coloring Challenges: ...</h2>
<h2>💡 Benefits of Coloring Books: ...</h2>`;
  } else {
    // 替换用户模板中的占位符
    const displayTitle = getDisplayText(title)
    contentPrompt = contentPrompt
      .replace(/\$\{keyword\}/g, keyword)
      .replace(/\$\{title\}/g, displayTitle)
      .replace(/\$\{prompt\}/g, promptText)
      // 也支持不带$符号的占位符格式（向后兼容）
      .replace(/\{keyword\}/g, keyword)
      .replace(/\{title\}/g, displayTitle)
      .replace(/\{prompt\}/g, promptText);
  }

  console.log('文案prompt: ', contentPrompt)

  // 根据语言选择配置system content - 控制生成内容的语言
  const systemContent = language === 'zh'
    ? '你是一个专业的涂色书内容创作专家，擅长为不同主题创作实用且富有启发性的涂色指导内容。无论输入的内容是什么语言，输出内容都必须是中文。请确保所有文本内容都是中文，包括标题和描述。例如使用"涂色技巧"而不是"Coloring Tips"，使用"涂色挑战"而不是"Coloring Challenges"，使用"涂色书的益处"而不是"Benefits of Coloring Books"。'
    : 'You are a professional coloring book content creation expert who excels at creating practical and inspiring coloring guidance content for different themes. Regardless of what language the input content is in, the output content must be in English.'

  try {
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: model,
      messages: [
        {
          role: 'system',
          content: systemContent
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

    console.log('DeepSeek API返回的详细内容: ', response.data.choices[0].message.content)

    return response.data.choices[0].message.content
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.response?.data || error.message)
    throw error
  }
}

// 通用文本生成API
app.post('/api/generate-text', async (req, res) => {
  const { model, prompt, language = 'zh' } = req.body // 添加language参数，默认为中文

  // 参数验证
  if (!model || !prompt) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数：model 和 prompt'
    })
  }

  console.log('🔍 文本生成API参数:')
  console.log('- model:', model)
  console.log('- language:', language)
  console.log('- prompt:', prompt.substring(0, 100) + '...')

  try {
    let content = ''

    // 根据语言设置系统提示词
    let systemPrompt = ''
    if (language === 'en') {
      systemPrompt = 'You are a professional content creation expert who can generate high-quality, practical text content. Please ensure the content is accurate, professional, and engaging. Please respond in English.'
    } else if (language === 'zh') {
      systemPrompt = '你是一个专业的内容创作专家，能够生成高质量、实用的文本内容。请确保内容准确、专业且富有吸引力。请用中文回答。'
    } else {
      // 其他语言的通用提示
      const languageNames = {
        'ja': 'Japanese',
        'ko': 'Korean',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ar': 'Arabic'
      }
      const languageName = languageNames[language] || language
      systemPrompt = `You are a professional content creation expert who can generate high-quality, practical text content. Please ensure the content is accurate, professional, and engaging. Please respond in ${languageName}.`
    }

    if (model.includes('deepseek')) {
      // 使用 DeepSeek API
      if (!process.env.DEEPSEEK_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'DeepSeek API Key 未配置'
        })
      }

      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      content = response.data.choices[0].message.content

    } else if (model.includes('gpt')) {
      // 使用 OpenAI API
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        return res.status(500).json({
          success: false,
          message: 'OpenAI API Key 未配置'
        })
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
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

      content = response.data.choices[0].message.content

    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的模型类型'
      })
    }

    console.log('✅ 文本生成成功，内容长度:', content.length)

    res.json({
      success: true,
      content: content,
      model: model,
      language: language,
      prompt_length: prompt.length
    })

  } catch (error) {
    console.error('文本生成失败:', error.response?.data || error.message)
    res.status(500).json({
      success: false,
      message: '文本生成失败: ' + (error.response?.data?.error?.message || error.message)
    })
  }
})

// 分类描述生成API
app.post('/api/generate-category-description', async (req, res) => {
  const { categoryId, displayName, model, prompt, language = 'zh' } = req.body // 添加language参数

  // 参数验证
  if (!categoryId || !displayName || !model || !prompt) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数：categoryId, displayName, model, prompt'
    })
  }

  console.log('🔍 分类描述生成API参数:')
  console.log('- categoryId:', categoryId)
  console.log('- displayName:', displayName)
  console.log('- model:', model)
  console.log('- language:', language)
  console.log('- prompt:', prompt.substring(0, 100) + '...')

  try {
    // 替换提示词中的占位符
    const finalPrompt = prompt.replace(/\$\{displayName\}/g, displayName)

    let description = ''

    // 根据语言设置系统提示词
    let systemPrompt = ''
    if (language === 'en') {
      systemPrompt = 'You are a professional coloring book content creation expert who specializes in creating interesting and educational category descriptions for various themes. Please ensure the content is suitable for both children and adult users, with a warm, professional, and practical style. Please respond in English.'
    } else if (language === 'zh') {
      systemPrompt = '你是一个专业的涂色书内容创作专家，擅长为各种主题创作有趣且富有教育意义的分类描述。请确保内容适合儿童和成人用户，风格要温馨、专业且实用。请用中文回答。'
    } else {
      // 其他语言的通用提示
      const languageNames = {
        'ja': 'Japanese',
        'ko': 'Korean',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ar': 'Arabic'
      }
      const languageName = languageNames[language] || language
      systemPrompt = `You are a professional coloring book content creation expert who specializes in creating interesting and educational category descriptions for various themes. Please ensure the content is suitable for both children and adult users, with a warm, professional, and practical style. Please respond in ${languageName}.`
    }

    if (model.includes('deepseek')) {
      // 使用 DeepSeek API
      if (!process.env.DEEPSEEK_API_KEY) {
        return res.status(500).json({
          success: false,
          message: 'DeepSeek API Key 未配置'
        })
      }

      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      description = response.data.choices[0].message.content

    } else if (model.includes('gpt')) {
      // 使用 OpenAI API
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
        return res.status(500).json({
          success: false,
          message: 'OpenAI API Key 未配置'
        })
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: finalPrompt
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

      description = response.data.choices[0].message.content

    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的模型类型'
      })
    }

    console.log('✅ 分类描述生成成功，内容长度:', description.length)

    res.json({
      success: true,
      description: description,
      categoryId: categoryId,
      displayName: displayName,
      model: model,
      language: language
    })

  } catch (error) {
    console.error('分类描述生成失败:', error.response?.data || error.message)
    res.status(500).json({
      success: false,
      message: '分类描述生成失败: ' + (error.response?.data?.error?.message || error.message)
    })
  }
})

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
app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`健康检查: http://localhost:${PORT}/api/health`)

  // 测试数据库连接
  console.log('正在测试数据库连接...')
  await testConnection()
})