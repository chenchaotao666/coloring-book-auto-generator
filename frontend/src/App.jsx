import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Check, CheckCircle, Clock, Edit3, Home, Image, ImageIcon, Languages, Palette, PlusCircle, Save, Settings, Tag, Trash2, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import CategoriesManager from './components/CategoriesManager'
import ImageForm from './components/ImageForm'
import ImagesManager from './components/ImagesManager'
import TagsManager from './components/TagsManager'

// 工具函数：从多语言对象中提取显示文本
const getDisplayText = (field, preferredLang = 'zh') => {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (typeof field === 'object') {
    return field[preferredLang] || field.zh || field.en || Object.values(field)[0] || ''
  }
  return ''
}

function App() {
  // 默认文案生成提示词模板
  const defaultTemplate = `基于以下信息生成涂色书的详细内容文案：

关键词：\${keyword}
标题：\${title}
图片描述：\${prompt}

请生成包含以下三个部分的内容：

1. 涂色技巧：针对这个\${keyword}主题的具体涂色建议和技巧
2. 涂色挑战：适合这个主题的有趣挑战和创意建议  
3. 填色书的好处：涂色这个主题对身心的益处

请用温馨、专业的语调，内容要实用且有启发性。每个部分2-3句话即可。

返回格式为纯文本，用emoji图标分隔各部分：
🎨 涂色技巧：...
🎯 涂色挑战：...
💡 填色书的好处：...`

  // 预设AI提示词模板选项
  const templatePresets = [
    {
      name: '标准三部分格式（默认）',
      content: defaultTemplate
    },
    {
      name: '简洁实用提示词',
      content: `为\${keyword}主题生成涂色指导内容：

主题：\${keyword}
标题：\${title}
特征：\${prompt}

请生成简洁实用的涂色指导，包含：
1. 基础涂色技巧和色彩建议
2. 适合初学者的简单方法
3. 涂色的放松和创意价值

用友善、鼓励的语调，每部分2句话，用🎨、🌟、💫等emoji分隔。`
    },
    {
      name: '教育导向提示词',
      content: `针对\${keyword}主题创作教育性涂色内容：

主题关键词：\${keyword}
页面标题：\${title}  
图像描述：\${prompt}

请从教育角度生成内容，包含：
1. 🎯 学习目标：通过涂色培养的能力
2. 📚 知识拓展：与主题相关的有趣知识
3. 🌟 成长价值：涂色对儿童发展的积极作用

语言要适合家长和老师使用，每部分3-4句话。`
    },
    {
      name: '趣味互动提示词',
      content: `为\${keyword}设计有趣的涂色体验：

涂色主题：\${keyword}
作品标题：\${title}
视觉元素：\${prompt}

创作充满趣味的内容：
1. 🎉 涂色游戏：设计有趣的涂色挑战
2. 🌈 创意建议：鼓励大胆的色彩实验  
3. 🏆 成就感：完成后的自豪和分享快乐

用活泼、充满想象力的语言，让涂色变成一场冒险！`
    },
    {
      name: '专业艺术提示词',
      content: `为\${keyword}主题制作专业级涂色指导：

艺术主题：\${keyword}
作品名称：\${title}
造型特点：\${prompt}

请提供专业的艺术指导：
1. 🎨 色彩理论：配色原理和色彩心理学应用
2. 🖌️ 技法指导：渐变、混色、光影等高级技巧
3. 🖼️ 艺术价值：提升审美和艺术鉴赏能力

用专业但易懂的语言，适合有一定基础的涂色爱好者。`
    }
  ]

  // 默认主题生成提示词模板
  const defaultThemeTemplate = `请基于关键词"\${keyword}"和描述"\${description}"，生成\${count}个不同主题的涂色页概念。

每个主题都应该：
1. 围绕\${keyword}这个核心元素
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

  // 预设主题生成提示词模板选项
  const themeTemplatePresets = [
    {
      name: '标准创意主题（默认）',
      content: defaultThemeTemplate
    },
    {
      name: '儿童友好主题',
      content: `为儿童设计\${keyword}主题的涂色页，生成\${count}个适合儿童的创意主题：

关键词：\${keyword}
附加描述：\${description}

要求：
- 主题要适合3-12岁儿童
- 内容积极正面，充满想象力
- 难度适中，不要太复杂
- 色彩鲜明，线条清晰

为每个主题生成：
1. 标题：简单易懂的儿童友好标题
2. 描述：生动有趣的主题介绍
3. AI提示词：适合儿童涂色的图像描述

请返回JSON格式的\${count}个主题。`
    },
    {
      name: '教育学习主题',
      content: `结合\${keyword}主题创建具有教育意义的涂色页，生成\${count}个学习主题：

学习主题：\${keyword}
教育重点：\${description}

设计要求：
- 融入知识学习元素
- 培养观察和认知能力
- 寓教于乐的设计理念
- 适合课堂或家庭教育使用

每个主题包含：
- 标题：体现学习目标的标题
- 描述：说明教育价值和学习要点
- AI提示词：结合教育元素的图像描述

输出\${count}个教育主题的JSON格式数据。`
    },
    {
      name: '艺术创意主题',
      content: `以\${keyword}为灵感创作艺术性涂色主题，生成\${count}个富有创意的艺术主题：

艺术灵感：\${keyword}
创作方向：\${description}

艺术要求：
- 具有艺术美感和创意性
- 线条优美，构图平衡
- 适合培养艺术鉴赏力
- 鼓励个性化表达

设计内容：
- 标题：富有艺术气息的标题
- 描述：突出艺术特色和创作理念
- AI提示词：详细的艺术风格描述

请生成\${count}个艺术主题的JSON数据。`
    },
    {
      name: '节日庆典主题',
      content: `围绕\${keyword}设计节日庆典涂色主题，创建\${count}个节庆相关主题：

节庆元素：\${keyword}
庆典特色：\${description}

节日设计：
- 体现节日氛围和庆祝元素
- 包含传统文化和现代元素
- 营造欢乐祥和的气氛
- 适合全家共同参与

主题内容：
- 标题：富有节日气氛的标题
- 描述：突出庆典特色和文化内涵
- AI提示词：包含节日元素的图像描述

输出\${count}个节庆主题的JSON格式。`
    }
  ]

  // 表单状态
  const [formData, setFormData] = useState({
    keyword: '',
    description: '',
    count: 1,
    template: defaultTemplate, // 文案生成提示词模板
    themeTemplate: defaultThemeTemplate, // 主题生成提示词模板
    model: 'deepseek-chat'
  })

  // 生成的内容列表
  const [contentList, setContentList] = useState([])
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false)
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [isGeneratingColoring, setIsGeneratingColoring] = useState(false) // 新增：上色状态
  const [coloringProgress, setColoringProgress] = useState(null) // 新增：上色进度
  const [coloringTasks, setColoringTasks] = useState(new Map()) // 新增：上色任务映射
  const [generationProgress, setGenerationProgress] = useState(null)
  const [imageProgress, setImageProgress] = useState(null)
  const [currentImageTaskId, setCurrentImageTaskId] = useState(null) // 当前图片生成任务ID
  const [globalImageRatio, setGlobalImageRatio] = useState('1:1') // 全局图片比例
  const [editingId, setEditingId] = useState(null)
  const [editingField, setEditingField] = useState('')
  const [editingValue, setEditingValue] = useState('')

  // 图片保存相关状态
  const [saveOptions, setSaveOptions] = useState({ categories: [], tags: [] })
  const [selectedImages, setSelectedImages] = useState(new Set())
  const [isSaving, setIsSaving] = useState(false)
  // 每张图片的分类选择 - 使用 Map 存储每张图片的选择
  const [imageCategorySelections, setImageCategorySelections] = useState(new Map())
  const [imageTagSelections, setImageTagSelections] = useState(new Map())

  // API选择相关状态
  const [selectedApiType, setSelectedApiType] = useState('gpt4o') // 'gpt4o' 或 'flux-kontext'
  const [fluxModel, setFluxModel] = useState('flux-kontext-pro') // 'flux-kontext-pro' 或 'flux-kontext-max'

  // 上色提示词状态
  const [coloringPrompt, setColoringPrompt] = useState('用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明')

  // 文生图提示词状态
  const [text2imagePrompt, setText2imagePrompt] = useState('生成适合儿童涂色的黑白线稿，线条简洁清晰，无填充色彩，风格简约卡通')

  // 图生图提示词状态
  const [imageToImagePrompt, setImageToImagePrompt] = useState('将图片转换为适合儿童涂色的黑白线稿，保留主要轮廓，去除细节和色彩，线条简洁清晰')

  // 导航状态
  const [currentPage, setCurrentPage] = useState('generator') // 'generator'、'categories'、'tags' 或 'images'

  // 国际化相关状态
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [isGeneratingInternationalization, setIsGeneratingInternationalization] = useState(false)

  // 查看详情相关状态
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [viewingContent, setViewingContent] = useState(null)

  // 每个内容项的编辑语言状态
  const [contentEditingLanguages, setContentEditingLanguages] = useState(new Map())

  // 单个翻译任务状态
  const [singleTranslationTasks, setSingleTranslationTasks] = useState(new Map())

  // 单个图片上色状态
  const [singleColoringTasks, setSingleColoringTasks] = useState(new Map()) // 存储单个图片的上色任务

  // 文生图和图生图任务状态
  const [textToImageTasks, setTextToImageTasks] = useState(new Map()) // key: formData.id, value: {taskId, progress, status}
  const [imageToImageTasks, setImageToImageTasks] = useState(new Map()) // key: formData.id, value: {taskId, progress, status}

  // 支持的语言配置
  const supportedLanguages = [
    { code: 'en', name: '英语' },
    { code: 'ja', name: '日语' },
    { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' },
    { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' },
    { code: 'it', name: '意大利语' },
    { code: 'pt', name: '葡萄牙语' },
    { code: 'ru', name: '俄语' },
    { code: 'ar', name: '阿拉伯语' }
  ]

  // 语言选项（用于多选下拉框）
  const languageOptions = supportedLanguages.map(lang => ({
    value: lang.code,
    label: lang.name
  }))

  // 组件挂载时加载保存选项
  useEffect(() => {
    loadSaveOptions()
  }, [])



  // 处理表单输入
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // 生成内容
  // 第一步：生成主题
  const generateThemes = async () => {
    if (!formData.keyword.trim()) {
      alert('请输入关键词')
      return
    }

    setIsGeneratingThemes(true)
    setContentList([]) // 清空之前的内容
    setGenerationProgress({ current: 0, total: formData.count, message: '准备开始生成主题...' })

    try {
      const response = await fetch('/api/generate-themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: formData.keyword,
          description: formData.description,
          count: formData.count,
          model: formData.model,
          themeTemplate: formData.themeTemplate // 添加用户的AI主题生成提示词模板
        }),
      })

      if (!response.ok) {
        throw new Error('生成主题失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (data.type) {
                case 'start':
                  setGenerationProgress({
                    current: 0,
                    total: data.total,
                    message: data.message
                  })
                  break

                case 'theme_content':
                  // 显示生成的主题，添加默认图片比例和name字段
                  const newItem = {
                    ...data.content,
                    name: data.content.name || data.content.title, // 初始化name字段
                    imagePath: null,
                    coloringUrl: null, // 初始化上色URL字段
                    imageRatio: globalImageRatio, // 使用当前全局比例作为默认值
                    hotness: 0 // 初始化热度值
                  }
                  setContentList(prev => [...prev, newItem])

                  // 初始化新项目的编辑语言状态
                  setContentEditingLanguages(prevLangs => {
                    const existingLanguages = getExistingLanguages(newItem)
                    return new Map(prevLangs.set(newItem.id, existingLanguages))
                  })

                  setGenerationProgress(prev => ({
                    ...prev,
                    current: data.stepProgress,
                    message: `已生成 ${data.stepProgress}/${data.totalItems} 个主题`
                  }))
                  break

                case 'complete':
                  setGenerationProgress({
                    current: data.successCount,
                    total: data.totalCount,
                    message: data.message
                  })

                  // 显示完成通知
                  setTimeout(() => {
                    setGenerationProgress(null)
                  }, 3000)
                  break

                case 'error':
                  console.error('生成主题错误:', data.message)
                  alert('生成主题失败: ' + data.message)
                  break
              }
            } catch (e) {
              console.error('解析数据失败:', e, line)
            }
          }
        }
      }
    } catch (error) {
      console.error('生成主题失败:', error)
      alert('生成主题失败: ' + error.message)
    } finally {
      setIsGeneratingThemes(false)
    }
  }

  // 第二步：生成文案
  const generateContent = async (forceRegenerate = false) => {
    if (contentList.length === 0) {
      alert('请先生成主题')
      return
    }

    // 根据是否强制重新生成决定要处理的项目
    let itemsToGenerate
    if (forceRegenerate) {
      // 强制重新生成：处理所有项目
      itemsToGenerate = contentList
    } else {
      // 正常生成：只处理没有文案的项目
      itemsToGenerate = contentList.filter(item => !item.content)
    }

    if (itemsToGenerate.length === 0) {
      alert('所有主题都已生成文案！')
      return
    }

    setIsGeneratingContent(true)
    const actionText = forceRegenerate ? '重新生成' : '生成'
    setGenerationProgress({ current: 0, total: itemsToGenerate.length, message: `准备为${itemsToGenerate.length}个主题${actionText}文案...` })

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: itemsToGenerate,
          keyword: formData.keyword,
          model: formData.model,
          template: formData.template // 添加用户的AI提示词模板
        }),
      })

      if (!response.ok) {
        throw new Error('生成文案失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (data.type) {
                case 'start':
                  setGenerationProgress({
                    current: 0,
                    total: data.total,
                    message: data.message
                  })
                  break

                case 'progress':
                  setGenerationProgress(prev => ({
                    ...prev,
                    message: data.message
                  }))
                  break

                case 'content_generated':
                  // 更新对应项目的文案
                  setContentList(prev => prev.map(item =>
                    item.id === data.id
                      ? { ...item, content: data.content }
                      : item
                  ))

                  setGenerationProgress(prev => ({
                    ...prev,
                    current: data.stepProgress,
                    message: `已完成 ${data.stepProgress}/${data.totalItems} 个文案`
                  }))

                  if (data.warning) {
                    console.warn(data.warning)
                  }
                  break

                case 'complete':
                  setGenerationProgress({
                    current: data.successCount,
                    total: data.totalCount,
                    message: data.message
                  })

                  // 显示完成通知
                  setTimeout(() => {
                    setGenerationProgress(null)
                  }, 3000)
                  break

                case 'error':
                  console.error('生成文案错误:', data.message)
                  alert('生成文案失败: ' + data.message)
                  break
              }
            } catch (e) {
              console.error('解析数据失败:', e, line)
            }
          }
        }
      }
    } catch (error) {
      console.error('生成文案失败:', error)
      alert('生成文案失败: ' + error.message)
    } finally {
      setIsGeneratingContent(false)
    }
  }

  // 生成图片
  const generateImages = async () => {
    if (contentList.length === 0) {
      alert('请先生成内容')
      return
    }

    setIsGeneratingImages(true)
    setImageProgress(null)

    try {
      // 1. 创建图片生成任务，添加API选择参数
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contentList.map(item => {
            const aiPrompt = getDisplayText(item.prompt) || '生成涂色书图片'  // AI提示词（从用户输入的提示词字段获取）
            const text2imagePromptValue = text2imagePrompt.trim() || '生成适合儿童涂色的黑白线稿，线条简洁清晰，无填充色彩，风格简约卡通'  // 文生图提示词（通用描述），提供默认值

            return {
              id: item.id,
              title: getDisplayText(item.title),
              aiPrompt: aiPrompt,  // AI提示词（单张图片描述）
              text2imagePrompt: text2imagePromptValue,  // 文生图提示词（通用描述）
              imageRatio: item.imageRatio || globalImageRatio // 使用项目特定比例或全局比例
            }
          }),
          apiType: selectedApiType, // 添加API类型
          model: selectedApiType === 'flux-kontext' ? fluxModel : undefined // 添加模型选择
        }),
      })

      if (!response.ok) {
        throw new Error('创建图片生成任务失败')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '创建任务失败')
      }

      setCurrentImageTaskId(result.taskId)
      console.log('图片生成任务已创建:', result.taskId)

      // 2. 开始轮询进度
      pollImageProgress(result.taskId)

    } catch (error) {
      console.error('生成图片失败:', error)
      alert('生成图片失败: ' + error.message)
      setIsGeneratingImages(false)
      setImageProgress(null)
    }
  }

  // 轮询图片生成进度
  const pollImageProgress = async (taskId) => {
    const pollInterval = 2000 // 每2秒查询一次
    let pollCount = 0
    const maxPolls = 150 // 最多查询5分钟 (150 * 2秒)

    const poll = async () => {
      try {
        const response = await fetch(`/api/image-progress/${taskId}`)

        if (!response.ok) {
          throw new Error('查询进度失败')
        }

        const progress = await response.json()

        // 更新进度显示
        setImageProgress({
          taskId: progress.taskId,
          status: progress.status,
          message: progress.message,
          current: progress.completedImages,
          total: progress.totalImages,
          currentBatch: progress.currentBatch,
          totalBatches: progress.totalBatches,
          details: progress.images
        })

        // 更新内容列表中的图片路径
        setContentList(prev => prev.map(item => {
          const imageInfo = progress.images[item.id]
          if (imageInfo && imageInfo.imagePath) {
            return { ...item, imagePath: imageInfo.imagePath }
          }
          return item
        }))

        // 检查是否完成
        if (progress.status === 'completed' || progress.status === 'error') {
          setIsGeneratingImages(false)

          // 3秒后清除进度显示
          setTimeout(() => {
            setImageProgress(null)
            setCurrentImageTaskId(null)
          }, 3000)

          return
        }

        // 检查是否暂停
        if (progress.status === 'paused') {
          // 暂停时不继续轮询，等待恢复
          console.log('任务已暂停，停止轮询')
          return
        }

        // 继续轮询
        pollCount++
        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval)
        } else {
          throw new Error('查询超时')
        }

      } catch (error) {
        console.error('查询进度失败:', error)
        setIsGeneratingImages(false)
        setImageProgress(prev => prev ? {
          ...prev,
          status: 'error',
          message: '查询进度失败: ' + error.message
        } : null)
      }
    }

    // 开始轮询
    poll()
  }

  // 暂停图片生成
  const pauseImageGeneration = async () => {
    if (!currentImageTaskId) return

    try {
      const response = await fetch(`/api/pause-image-generation/${currentImageTaskId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('暂停失败')
      }

      const result = await response.json()
      console.log('任务已暂停:', result.message)

    } catch (error) {
      console.error('暂停失败:', error)
      alert('暂停失败: ' + error.message)
    }
  }

  // 恢复图片生成
  const resumeImageGeneration = async () => {
    if (!currentImageTaskId) return

    try {
      const response = await fetch(`/api/resume-image-generation/${currentImageTaskId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('恢复失败')
      }

      const result = await response.json()
      console.log('任务已恢复:', result.message)

      // 恢复轮询
      pollImageProgress(currentImageTaskId)

    } catch (error) {
      console.error('恢复失败:', error)
      alert('恢复失败: ' + error.message)
    }
  }

  // 第四步：批量上色
  const handleBatchColoring = async () => {
    // 过滤出有图片的内容
    const itemsWithImages = contentList.filter(item => item.imagePath)

    if (itemsWithImages.length === 0) {
      alert('没有可上色的图片！请先生成图片。')
      return
    }

    // 检查哪些图片已有上色版本
    const itemsWithColoring = itemsWithImages.filter(item => item.coloringUrl)
    const itemsWithoutColoring = itemsWithImages.filter(item => !item.coloringUrl)

    let itemsToColor = itemsWithoutColoring

    // 如果有已上色的图片，询问是否重新上色
    if (itemsWithColoring.length > 0) {
      const includeExisting = confirm(
        `检测到 ${itemsWithColoring.length} 张图片已有上色版本，${itemsWithoutColoring.length} 张图片未上色。\n\n` +
        `点击"确定"将为所有 ${itemsWithImages.length} 张图片重新上色（覆盖现有上色）\n` +
        `点击"取消"将只为 ${itemsWithoutColoring.length} 张未上色的图片上色`
      )

      if (includeExisting) {
        itemsToColor = itemsWithImages // 包含所有图片
      } else if (itemsWithoutColoring.length === 0) {
        alert('没有需要上色的图片！')
        return
      }
    } else if (itemsWithoutColoring.length === 0) {
      alert('没有可上色的图片！请先生成图片。')
      return
    }

    if (!confirm(`确认为 ${itemsToColor.length} 张图片生成上色版本？`)) {
      return
    }

    setIsGeneratingColoring(true)
    setColoringProgress({
      current: 0,
      total: itemsToColor.length,
      message: '准备开始批量上色...',
      details: {}
    })

    try {
      // 直接对所有有图片的内容进行上色，无需检查数据库ID
      const finalItemsToColor = itemsToColor

      const newTasks = new Map()

      // 为每个需要上色的图片创建上色任务
      for (let i = 0; i < finalItemsToColor.length; i++) {
        const item = finalItemsToColor[i]

        // 使用图片URL而不是数据库ID
        const imageUrl = item.imagePath || item.defaultUrl

        if (!imageUrl) {
          throw new Error(`图片"${getDisplayText(item.title)}"缺少图片URL`)
        }

        try {
          setColoringProgress(prev => ({
            ...prev,
            current: i,
            message: `正在创建上色任务 ${i + 1}/${finalItemsToColor.length}...`
          }))

          // 构造提示词 - 优先使用AI提示词字段
          const prompt = getDisplayText(item.prompt) || '涂色页'

          // 调用上色API，使用图片URL
          const response = await fetch('/api/images/color-generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: imageUrl, // 直接使用图片URL
              prompt: prompt,
              coloringPrompt: coloringPrompt.trim() || null, // 传递用户自定义的上色提示词
              options: {
                ratio: item.imageRatio || '1:1',
                isEnhance: false,
                nVariants: 1,
                apiType: selectedApiType, // 添加API类型
                model: selectedApiType === 'flux-kontext' ? fluxModel : undefined // 添加模型选择
              }
            }),
          })

          const data = await response.json()

          if (data.success && data.data.coloringResult?.taskId) {
            // 记录任务ID与内容的映射
            newTasks.set(data.data.coloringResult.taskId, {
              itemId: item.id,
              imageUrl: imageUrl, // 使用图片URL而不是数据库ID
              status: 'processing',
              createdAt: new Date(),
              apiType: selectedApiType // 记录API类型
            })

            // 更新进度详情
            setColoringProgress(prev => ({
              ...prev,
              details: {
                ...prev.details,
                [item.id]: {
                  title: getDisplayText(item.title),
                  status: 'processing',
                  progress: 0,
                  message: '上色任务已创建'
                }
              }
            }))

            console.log(`上色任务已创建: ${data.data.coloringResult.taskId} for ${getDisplayText(item.title)}`)
          } else {
            throw new Error(data.message || '创建上色任务失败')
          }

        } catch (error) {
          console.error(`为 "${getDisplayText(item.title)}" 创建上色任务失败:`, error)

          // 更新进度详情显示错误
          setColoringProgress(prev => ({
            ...prev,
            details: {
              ...prev.details,
              [item.id]: {
                title: getDisplayText(item.title),
                status: 'error',
                progress: 0,
                message: `创建失败: ${error.message}`
              }
            }
          }))
        }

        // 任务间延迟，避免过载
        if (i < finalItemsToColor.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // 更新任务映射
      setColoringTasks(newTasks)

      // 开始轮询所有任务状态
      if (newTasks.size > 0) {
        setColoringProgress(prev => ({
          ...prev,
          current: finalItemsToColor.length,
          message: `${newTasks.size} 个上色任务已创建，正在处理中...`
        }))

        pollColoringTasks(newTasks)
      } else {
        setColoringProgress(prev => ({
          ...prev,
          message: '所有上色任务创建失败'
        }))
        setTimeout(() => {
          setIsGeneratingColoring(false)
          setColoringProgress(null)
        }, 3000)
      }

    } catch (error) {
      console.error('批量上色失败:', error)
      alert('批量上色失败: ' + error.message)
      setIsGeneratingColoring(false)
      setColoringProgress(null)
    }
  }

  // 轮询上色任务状态
  const pollColoringTasks = async (tasks) => {
    const pollInterval = 3000 // 每3秒查询一次
    let completedTasks = 0
    let activeTasks = new Map(tasks)

    const poll = async () => {
      try {
        const taskEntries = Array.from(activeTasks.entries())
        console.log(`🔄 开始轮询 ${taskEntries.length} 个上色任务`)

        for (const [taskId, taskInfo] of taskEntries) {
          try {
            console.log(`🔍 检查上色任务状态: ${taskId}`)
            const response = await fetch(`/api/images/task-status/${taskId}?taskType=image-coloring&apiType=${taskInfo.apiType || selectedApiType}`)
            const data = await response.json()

            console.log(`📊 任务 ${taskId} 状态响应:`, data)

            if (data.success) {
              const status = data.data.status
              console.log(`📈 任务 ${taskId} 当前状态: ${status}`)

              if (status === 'completed' && (data.data.coloringUrl || data.data.imageUrl)) {
                // 获取上色后的图片URL
                const coloringUrl = data.data.coloringUrl || data.data.imageUrl

                // 任务完成，更新contentList
                setContentList(prev => prev.map(item =>
                  item.id === taskInfo.itemId
                    ? { ...item, coloringUrl: coloringUrl }
                    : item
                ))

                // 如果正在查看详情弹框，且更新的项目与查看的项目匹配，同步更新viewingContent
                if (viewingContent && viewingContent.id === taskInfo.itemId) {
                  console.log('🔄 批量上色完成，同步更新查看详情弹框数据')
                  setViewingContent(prev => ({
                    ...prev,
                    coloringUrl: coloringUrl
                  }))
                  console.log('✅ 批量上色：查看详情弹框的coloringUrl已同步更新:', coloringUrl)
                }

                // 更新进度详情
                setColoringProgress(prev => ({
                  ...prev,
                  details: {
                    ...prev.details,
                    [taskInfo.itemId]: {
                      ...prev.details[taskInfo.itemId],
                      status: 'completed',
                      progress: 100,
                      message: '上色完成'
                    }
                  }
                }))

                activeTasks.delete(taskId)
                completedTasks++

                console.log(`上色完成: ${taskInfo.itemId}`)

              } else if (status === 'failed') {
                // 任务失败
                setColoringProgress(prev => ({
                  ...prev,
                  details: {
                    ...prev.details,
                    [taskInfo.itemId]: {
                      ...prev.details[taskInfo.itemId],
                      status: 'error',
                      progress: 0,
                      message: `上色失败: ${data.data.message || '未知错误'}`
                    }
                  }
                }))

                activeTasks.delete(taskId)
                completedTasks++

              } else if (status === 'processing') {
                // 更新进度 - 处理0-1小数格式转换为百分比
                let rawProgress = data.data.progress || 0
                let displayProgress = rawProgress
                // 如果进度值是0-1之间的小数，转换为0-100的整数
                if (rawProgress <= 1) {
                  displayProgress = Math.round(rawProgress * 100)
                }
                setColoringProgress(prev => ({
                  ...prev,
                  details: {
                    ...prev.details,
                    [taskInfo.itemId]: {
                      ...prev.details[taskInfo.itemId],
                      status: 'processing',
                      progress: displayProgress,
                      message: `上色中... ${displayProgress}%`
                    }
                  }
                }))
              }
            } else {
              console.error(`❌ 批量上色任务状态查询失败: ${taskId}`, data)
            }
          } catch (error) {
            console.error(`检查上色任务 ${taskId} 状态失败:`, error)
          }
        }

        // 更新总体进度
        setColoringProgress(prev => ({
          ...prev,
          current: completedTasks,
          message: `上色进度: ${completedTasks}/${prev.total} 已完成`
        }))

        // 检查是否所有任务都完成了
        if (activeTasks.size === 0) {
          setColoringProgress(prev => ({
            ...prev,
            message: `上色完成！成功处理 ${completedTasks}/${prev.total} 张图片`
          }))

          setTimeout(() => {
            setIsGeneratingColoring(false)
            setColoringProgress(null)
          }, 3000)
          return
        }

        // 继续轮询
        console.log(`⏳ 继续轮询，剩余 ${activeTasks.size} 个任务`)
        setTimeout(poll, pollInterval)

      } catch (error) {
        console.error('轮询上色任务状态失败:', error)
        console.log(`⏳ 轮询错误后重试，剩余 ${activeTasks.size} 个任务`)
        setTimeout(poll, pollInterval)
      }
    }

    // 开始轮询
    console.log(`🚀 开始批量上色轮询，任务数量: ${tasks.size}`)
    setTimeout(poll, 3000) // 3秒后开始第一次轮询
  }

  // 获取保存选项（分类和标签）
  const loadSaveOptions = async () => {
    try {
      const response = await fetch('/api/images/save-options')
      const data = await response.json()

      if (data.success) {
        setSaveOptions(data.data)
      } else {
        console.error('获取保存选项失败:', data.message)
      }
    } catch (error) {
      console.error('获取保存选项时出错:', error)
    }
  }

  // 保存选中的图片到数据库
  const saveSelectedImages = async () => {
    if (selectedImages.size === 0) {
      alert('请先选择要保存的图片')
      return
    }

    setIsSaving(true)

    try {
      const selectedItems = contentList.filter(item => selectedImages.has(item.id))

      if (selectedItems.length === 0) {
        alert('请先选择要保存的内容')
        return
      }

      // 分别处理新增和更新的项目
      const itemsToCreate = []
      const itemsToUpdate = []

      selectedItems.forEach(item => {
        const categoryId = imageCategorySelections.get(item.id) || item.savedCategoryId || null
        const tagIds = Array.from(imageTagSelections.get(item.id) || item.savedTagIds || [])



        // 处理多语言字段，如果是字符串则转换为对象
        const formatMultiLangField = (value) => {
          if (!value) return { zh: '' }
          if (typeof value === 'object') return value
          return { zh: value }
        }

        const imageData = {
          name: formatMultiLangField(item.name || item.title),
          title: formatMultiLangField(item.title),
          description: formatMultiLangField(item.description),
          imagePath: item.imagePath,
          defaultUrl: item.defaultUrl || item.imagePath, // 添加defaultUrl字段
          colorUrl: item.colorUrl || null, // 添加colorUrl字段
          coloringUrl: item.coloringUrl || null, // 添加coloringUrl字段
          prompt: formatMultiLangField(item.prompt),
          ratio: item.imageRatio || '1:1',
          type: item.type || 'text2image',
          isPublic: item.isPublic !== undefined ? item.isPublic : false,
          hotness: item.hotness || 0,
          size: item.size || '',
          categoryId: categoryId,
          tagIds: tagIds,
          userId: 'frontend_user',
          additionalInfo: formatMultiLangField(item.content),
          frontendId: item.id // 添加前端ID用于关联
        }



        if (item.databaseId) {
          // 已保存过，需要更新
          itemsToUpdate.push({
            ...imageData,
            id: item.databaseId
          })
        } else {
          // 未保存过，需要新增
          itemsToCreate.push(imageData)
        }
      })

      let totalSaved = 0
      let totalRequested = selectedItems.length
      const errors = []

      // 处理新增
      if (itemsToCreate.length > 0) {
        try {
          const createResponse = await fetch('/api/images/save-generated', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ images: itemsToCreate })
          })

          const createResult = await createResponse.json()

          if (createResult.success) {
            totalSaved += createResult.data.totalSaved

            // 更新contentList，添加databaseId
            setContentList(prevList =>
              prevList.map(item => {
                if (selectedImages.has(item.id) && !item.databaseId) {
                  // 找到对应的已保存图片记录
                  const savedImage = createResult.data.savedImages.find(saved =>
                    saved.additionalInfo &&
                    (saved.additionalInfo.frontendId === item.id || saved.name?.zh === getDisplayText(item.name || item.title))
                  )

                  if (savedImage) {
                    return {
                      ...item,
                      databaseId: savedImage.id,
                      savedCategoryId: imageCategorySelections.get(item.id) || null,
                      savedTagIds: Array.from(imageTagSelections.get(item.id) || []),
                      savedToDatabase: true
                    }
                  }
                }
                return item
              })
            )

            if (createResult.errors) {
              errors.push(...createResult.errors)
            }
          } else {
            errors.push({ error: `新增失败: ${createResult.message}` })
          }
        } catch (error) {
          console.error('新增内容失败:', error)
          errors.push({ error: `新增失败: ${error.message}` })
        }
      }

      // 处理更新
      if (itemsToUpdate.length > 0) {
        for (const imageData of itemsToUpdate) {
          try {
            const updateResponse = await fetch(`/api/images/${imageData.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(imageData)
            })

            const updateResult = await updateResponse.json()

            if (updateResult.success) {
              totalSaved += 1

              // 更新contentList中的保存状态
              setContentList(prevList =>
                prevList.map(item => {
                  if (item.databaseId === imageData.id) {

                    return {
                      ...item,
                      savedCategoryId: imageData.categoryId,
                      savedTagIds: imageData.tagIds,
                      savedToDatabase: true
                      // 注意：不覆盖coloringUrl等字段，保持原有值
                    }
                  }
                  return item
                })
              )
            } else {
              errors.push({ error: `更新失败 (ID: ${imageData.id}): ${updateResult.message}` })
            }
          } catch (error) {
            console.error(`更新内容失败 (ID: ${imageData.id}):`, error)
            errors.push({ error: `更新失败 (ID: ${imageData.id}): ${error.message}` })
          }
        }
      }

      // 显示结果
      const message = itemsToCreate.length > 0 && itemsToUpdate.length > 0
        ? `成功保存 ${totalSaved}/${totalRequested} 条内容 (新增 ${itemsToCreate.length}, 更新 ${itemsToUpdate.length})`
        : itemsToCreate.length > 0
          ? `成功新增 ${totalSaved}/${totalRequested} 条内容到数据库`
          : `成功更新 ${totalSaved}/${totalRequested} 条内容`

      alert(message)

      setSelectedImages(new Set()) // 清空选择

      // 只清除已保存项目的分类和标签选择状态，因为它们现在使用savedCategoryId和savedTagIds
      const savedImageIds = Array.from(selectedImages)
      setImageCategorySelections(prev => {
        const newMap = new Map(prev)
        savedImageIds.forEach(id => newMap.delete(id))
        return newMap
      })
      setImageTagSelections(prev => {
        const newMap = new Map(prev)
        savedImageIds.forEach(id => newMap.delete(id))
        return newMap
      })

      if (errors.length > 0) {
        console.warn('部分内容保存失败:', errors)
        alert(`保存完成，但有 ${errors.length} 个错误，请查看控制台`)
      }

    } catch (error) {
      console.error('保存内容时出错:', error)
      alert('保存内容时出错: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 切换图片选择状态
  const toggleImageSelection = (id) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 设置图片的分类选择
  const setImageCategory = (imageId, categoryId) => {
    setImageCategorySelections(prev => {
      const newMap = new Map(prev)
      if (categoryId) {
        newMap.set(imageId, categoryId)
      } else {
        newMap.delete(imageId)
      }
      return newMap
    })
  }

  // 切换图片的标签选择
  const toggleImageTag = (imageId, tagId) => {
    setImageTagSelections(prev => {
      const newMap = new Map(prev)
      const currentTags = newMap.get(imageId) || new Set()
      const newTags = new Set(currentTags)

      if (newTags.has(tagId)) {
        newTags.delete(tagId)
      } else {
        newTags.add(tagId)
      }

      if (newTags.size > 0) {
        newMap.set(imageId, newTags)
      } else {
        newMap.delete(imageId)
      }
      return newMap
    })
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedImages.size === contentList.length) {
      setSelectedImages(new Set()) // 取消全选
    } else {
      setSelectedImages(new Set(contentList.map(item => item.id))) // 全选
    }
  }

  // 直接保存选中的图片
  const handleSaveImages = async () => {
    if (selectedImages.size === 0) {
      alert('请先选择要保存的内容')
      return
    }

    await loadSaveOptions()
    await saveSelectedImages()
  }

  // 删除内容项
  const deleteContent = (id) => {
    setContentList(prev => prev.filter(item => item.id !== id))
    // 清理编辑语言状态
    setContentEditingLanguages(prev => {
      const newMap = new Map(prev)
      newMap.delete(id)
      return newMap
    })
  }

  // 开始编辑
  const startEdit = (id, field, value) => {
    setEditingId(id)
    setEditingField(field)
    setEditingValue(value)
  }

  // 保存编辑
  const saveEdit = () => {
    setContentList(prev => prev.map(item =>
      item.id === editingId
        ? { ...item, [editingField]: editingValue }
        : item
    ))
    cancelEdit()
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null)
    setEditingField('')
    setEditingValue('')
  }

  // 生成国际化内容
  const generateInternationalization = async () => {
    if (selectedLanguages.length === 0) {
      alert('请选择要翻译的语言')
      return
    }

    if (contentList.length === 0) {
      alert('请先生成内容')
      return
    }

    // 只为已经生成内容的项目生成国际化
    const itemsWithContent = contentList.filter(item => item.content)

    if (itemsWithContent.length === 0) {
      alert('没有可翻译的内容，请先生成文案')
      return
    }

    setIsGeneratingInternationalization(true)

    try {
      const requestData = {
        type: 'content', // 自定义类型，用于内容翻译
        items: itemsWithContent.map(item => ({
          id: item.id,
          name: getDisplayText(item.name || item.title),
          title: getDisplayText(item.title),
          description: getDisplayText(item.description),
          prompt: getDisplayText(item.prompt),
          additionalInfo: getDisplayText(item.content) // 将content作为additionalInfo传递
        })),
        targetLanguages: selectedLanguages
      }

      const response = await fetch('/api/internationalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        // 将翻译结果直接应用到contentList中
        setContentList(prevList =>
          prevList.map(item => {
            const translations = data.results[item.id]
            if (translations) {
              const updatedItem = { ...item }

              // 为每个语言更新多语言字段
              selectedLanguages.forEach(lang => {
                const translation = translations[lang]
                if (translation) {
                  // 更新各个多语言字段
                  const updateField = (field, translatedValue) => {
                    if (updatedItem[field]) {
                      if (typeof updatedItem[field] === 'string') {
                        updatedItem[field] = { zh: updatedItem[field], [lang]: translatedValue || '' }
                      } else if (typeof updatedItem[field] === 'object') {
                        updatedItem[field] = { ...updatedItem[field], [lang]: translatedValue || '' }
                      }
                    } else {
                      updatedItem[field] = { zh: '', [lang]: translatedValue || '' }
                    }
                  }

                  updateField('name', translation.name)
                  updateField('title', translation.title)
                  updateField('description', translation.description)
                  updateField('prompt', translation.prompt)
                  updateField('content', translation.additionalInfo) // additionalInfo对应content
                }
              })

              // 确保新语言被添加到编辑语言中
              selectedLanguages.forEach(lang => {
                addLanguageToContent(item.id, lang)
              })

              return updatedItem
            }
            return item
          })
        )

        // 不再保存翻译结果用于单独显示，直接应用到内容中
        // setInternationalizationResults(data.results)

        // 不再设置活跃语言，因为不需要单独显示翻译结果
        // if (selectedLanguages.length > 0) {
        //   setActiveInternationalizationLanguage(selectedLanguages[0])
        // }

        alert(`成功为 ${itemsWithContent.length} 个内容生成了 ${selectedLanguages.length} 种语言的翻译，翻译结果已自动应用到各项目的多语言内容中`)
      } else {
        alert('国际化失败: ' + data.message)
      }
    } catch (error) {
      console.error('国际化生成失败:', error)
      alert('国际化生成失败: ' + error.message)
    } finally {
      setIsGeneratingInternationalization(false)
    }
  }

  // 关闭详情对话框
  const closeDetailDialog = () => {
    setShowDetailDialog(false)
    setViewingContent(null)
  }

  // 获取所有已有的语言版本
  const getExistingLanguages = (formData) => {
    const allLanguages = new Set(['zh']) // 中文是必须的

      // 检查各个多语言字段中存在的语言
      ;['name', 'title', 'description', 'prompt'].forEach(field => {
        if (formData[field] && typeof formData[field] === 'object') {
          Object.keys(formData[field]).forEach(lang => {
            if (formData[field][lang]) {
              allLanguages.add(lang)
            }
          })
        }
      })

    return Array.from(allLanguages)
  }

  // 获取或初始化内容项的编辑语言
  const getContentEditingLanguages = (itemId, item) => {
    if (contentEditingLanguages.has(itemId)) {
      return contentEditingLanguages.get(itemId)
    } else {
      // 初始化为已存在的语言
      const existingLanguages = getExistingLanguages(item)
      setContentEditingLanguages(prev => new Map(prev.set(itemId, existingLanguages)))
      return existingLanguages
    }
  }

  // 添加语言到特定内容项
  const addLanguageToContent = (itemId, lang) => {
    setContentEditingLanguages(prev => {
      const currentLanguages = prev.get(itemId) || ['zh']
      if (!currentLanguages.includes(lang)) {
        return new Map(prev.set(itemId, [...currentLanguages, lang]))
      }
      return prev
    })
  }

  // 从特定内容项移除语言
  const removeLanguageFromContent = (itemId, lang) => {
    if (lang === 'zh') return // 不允许删除中文
    setContentEditingLanguages(prev => {
      const currentLanguages = prev.get(itemId) || ['zh']
      return new Map(prev.set(itemId, currentLanguages.filter(l => l !== lang)))
    })
  }

  // 处理单个翻译生成
  const handleGenerateTranslation = async (itemId, languageCode, originalItem) => {
    if (!itemId || !languageCode || languageCode === 'zh') return

    const taskKey = `${itemId}-${languageCode}`

    // 设置生成状态
    setSingleTranslationTasks(prev => {
      const newMap = new Map(prev)
      newMap.set(taskKey, { status: 'loading' })
      return newMap
    })

    try {
      // 获取中文内容作为源内容
      const sourceContent = {
        name: getDisplayText(originalItem.name || originalItem.title),
        title: getDisplayText(originalItem.title),
        description: getDisplayText(originalItem.description),
        prompt: getDisplayText(originalItem.prompt),
        additionalInfo: getDisplayText(originalItem.content) // content对应additionalInfo
      }

      const requestData = {
        type: 'content',
        items: [{
          id: itemId,
          name: sourceContent.name,
          title: sourceContent.title,
          description: sourceContent.description,
          prompt: sourceContent.prompt,
          additionalInfo: sourceContent.additionalInfo
        }],
        targetLanguages: [languageCode]
      }

      const response = await fetch('/api/internationalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success && data.results[itemId] && data.results[itemId][languageCode]) {
        // 更新翻译结果到contentList
        const newTranslation = data.results[itemId][languageCode]

        setContentList(prevList =>
          prevList.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item }

              // 更新各个多语言字段
              const updateField = (field, translatedValue) => {
                if (updatedItem[field]) {
                  if (typeof updatedItem[field] === 'string') {
                    updatedItem[field] = { zh: updatedItem[field], [languageCode]: translatedValue || '' }
                  } else if (typeof updatedItem[field] === 'object') {
                    updatedItem[field] = { ...updatedItem[field], [languageCode]: translatedValue || '' }
                  }
                } else {
                  updatedItem[field] = { zh: '', [languageCode]: translatedValue || '' }
                }
              }

              updateField('name', newTranslation.name)
              updateField('title', newTranslation.title)
              updateField('description', newTranslation.description)
              updateField('prompt', newTranslation.prompt)
              updateField('content', newTranslation.additionalInfo) // additionalInfo对应content

              return updatedItem
            }
            return item
          })
        )

        // 确保新语言被添加到编辑语言中
        addLanguageToContent(itemId, languageCode)

        // 清除生成状态
        setSingleTranslationTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(taskKey)
          return newMap
        })

        alert(`成功生成${supportedLanguages.find(lang => lang.code === languageCode)?.name || languageCode}翻译`)
      } else {
        throw new Error(data.message || '翻译生成失败')
      }
    } catch (error) {
      console.error('单独生成翻译失败:', error)
      alert('翻译生成失败: ' + error.message)

      // 清除生成状态
      setSingleTranslationTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(taskKey)
        return newMap
      })
    }
  }

  // 检查是否正在生成特定翻译
  const isGeneratingTranslation = (formData, languageCode) => {
    if (!formData.id || !languageCode || languageCode === 'zh') return false
    const taskKey = `${formData.id}-${languageCode}`
    return singleTranslationTasks.has(taskKey)
  }

  // 格式化多语言字段
  const formatMultiLangField = (field) => {
    if (!field) return ''

    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return parsed.zh || parsed.en || Object.values(parsed)[0] || ''
      } catch {
        return field
      }
    }

    if (typeof field === 'object') {
      return field.zh || field.en || Object.values(field)[0] || ''
    }

    return String(field)
  }

  // 将生成的内容项转换为ImageForm格式
  const convertItemToFormData = (item) => {
    // 优先使用已保存的分类和标签信息，如果没有则使用当前选择状态
    let categoryId, tagIds

    if (item.savedToDatabase) {
      // 如果已保存到数据库，优先使用保存的信息
      categoryId = item.savedCategoryId || null
      tagIds = item.savedTagIds || []
    } else {
      // 如果未保存，使用当前选择状态
      categoryId = imageCategorySelections.get(item.id) || null
      tagIds = Array.from(imageTagSelections.get(item.id) || [])
    }

    // 处理多语言字段的辅助函数
    const extractMultiLangField = (field, fallback = '') => {
      if (!field) return { zh: fallback }
      if (typeof field === 'object') return field
      return { zh: field }
    }

    const formData = {
      id: item.id, // 添加id字段，确保能够追踪到正确的item
      name: extractMultiLangField(item.name || item.title),
      title: extractMultiLangField(item.title),
      description: extractMultiLangField(item.description),
      prompt: extractMultiLangField(item.prompt),
      additionalInfo: extractMultiLangField(item.content), // 将content作为additionalInfo（文案内容）
      defaultUrl: item.imagePath || item.defaultUrl || '',  // 增加fallback
      colorUrl: item.colorUrl || '',
      coloringUrl: item.coloringUrl || '',  // 正确传递coloringUrl
      type: item.type || 'text2image',
      ratio: item.imageRatio || '1:1',
      isPublic: item.isPublic !== undefined ? item.isPublic : false,
      hotness: item.hotness || 0,
      categoryId: categoryId,
      size: item.size || '',
      tagIds: tagIds
    }

    // 当有coloringUrl时，验证数据传递
    if (item.coloringUrl) {
      console.log(`🖼️ convertItemToFormData - 检测到coloringUrl:`)
      console.log(`- 项目ID: ${item.id}`)
      console.log(`- 原始coloringUrl: ${item.coloringUrl}`)
      console.log(`- formData.coloringUrl: ${formData.coloringUrl}`)
    }



    return formData
  }

  // 处理生成内容的表单编辑
  const handleContentFormChange = (itemId, field, lang, value) => {
    setContentList(prevList =>
      prevList.map(item => {
        if (item.id === itemId) {
          switch (field) {
            case 'name':
              return {
                ...item,
                name: lang ? (typeof item.name === 'object'
                  ? { ...item.name, [lang]: value }
                  : { zh: typeof item.name === 'string' ? item.name : '', [lang]: value }) : value
              }
            case 'title':
              return {
                ...item,
                title: lang ? (typeof item.title === 'object'
                  ? { ...item.title, [lang]: value }
                  : { zh: typeof item.title === 'string' ? item.title : '', [lang]: value }) : value
              }
            case 'description':
              return {
                ...item,
                description: lang ? (typeof item.description === 'object'
                  ? { ...item.description, [lang]: value }
                  : { zh: typeof item.description === 'string' ? item.description : '', [lang]: value }) : value
              }
            case 'additionalInfo':
              return {
                ...item,
                content: lang ? (typeof item.content === 'object'
                  ? { ...item.content, [lang]: value }
                  : { zh: typeof item.content === 'string' ? item.content : '', [lang]: value }) : value
              } // additionalInfo对应content字段
            case 'prompt':
              return {
                ...item,
                prompt: lang ? (typeof item.prompt === 'object'
                  ? { ...item.prompt, [lang]: value }
                  : { zh: typeof item.prompt === 'string' ? item.prompt : '', [lang]: value }) : value
              }
            case 'ratio':
              return { ...item, imageRatio: value }
            case 'type':
              return { ...item, type: value }
            case 'size':
              return { ...item, size: value }
            case 'isPublic':
              return { ...item, isPublic: value }
            case 'hotness':
              return { ...item, hotness: value }
            case 'colorUrl':
              return { ...item, colorUrl: value }
            case 'coloringUrl':
              return { ...item, coloringUrl: value }
            case 'defaultUrl':
              return { ...item, imagePath: value, defaultUrl: value }  // 同时更新两个字段
            case 'categoryId':
              // 如果是已保存的项目，直接更新保存的分类信息
              if (item.savedToDatabase) {
                return { ...item, savedCategoryId: value }
              } else {
                // 未保存的项目，更新分类选择状态
                setImageCategory(itemId, value)
              }
              return item
            case 'tagIds':
              // 如果是已保存的项目，直接更新保存的标签信息
              if (item.savedToDatabase) {
                return { ...item, savedTagIds: value }
              } else {
                // 未保存的项目，更新标签选择状态
                const newTagSelections = new Map(imageTagSelections)
                newTagSelections.set(itemId, new Set(value || []))
                setImageTagSelections(newTagSelections)
              }
              return item
            default:
              return item
          }
        }
        return item
      })
    )
  }

  // 单个图片上色功能
  const handleSingleImageColoring = async (formData) => {
    if (!formData.defaultUrl) {
      alert('请先确保有默认图片URL')
      return
    }

    console.log('🎨 开始单个图片上色:')
    console.log('- formData.id:', formData.id)
    console.log('- formData.defaultUrl:', formData.defaultUrl)

    // 检查是否有数据库ID - 修复查找逻辑
    const imageItem = contentList.find(item => {
      // 方式1：通过前端ID匹配
      if (formData.id && item.id === formData.id) {
        console.log('✅ 通过前端ID找到匹配项:', item.id)
        return true
      }
      // 方式2：通过图片路径匹配
      if (formData.defaultUrl && (item.imagePath === formData.defaultUrl || item.defaultUrl === formData.defaultUrl)) {
        console.log('✅ 通过图片路径找到匹配项:', item.imagePath || item.defaultUrl)
        return true
      }
      return false
    })

    console.log('🔍 找到的图片项:', imageItem)

    try {

      // 构造提示词 - 优先使用AI提示词字段
      const prompt = formData.prompt?.zh || '涂色页'

      // 调用上色API，直接使用图片URL而不是数据库ID
      const response = await fetch('/api/images/color-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: formData.defaultUrl, // 直接使用图片URL
          prompt: prompt,
          coloringPrompt: coloringPrompt.trim() || null, // 传递用户自定义的上色提示词
          options: {
            ratio: formData.ratio || '1:1',
            isEnhance: false,
            nVariants: 1,
            apiType: selectedApiType, // 添加API类型
            model: selectedApiType === 'flux-kontext' ? fluxModel : undefined // 添加模型选择
          }
        }),
      })

      const data = await response.json()

      if (data.success && data.data.coloringResult?.taskId) {
        const taskId = data.data.coloringResult.taskId

        // 记录单个上色任务
        setSingleColoringTasks(prev => {
          const newMap = new Map(prev)
          const taskData = {
            imageUrl: formData.defaultUrl, // 使用图片URL而不是数据库ID
            formDataId: formData.id,
            frontendItemId: imageItem?.id,
            defaultUrl: formData.defaultUrl, // 添加URL用于匹配
            status: 'processing',
            createdAt: new Date(),
            apiType: selectedApiType // 记录API类型
          }
          newMap.set(taskId, taskData)
          console.log('📝 创建上色任务记录:', {
            taskId,
            taskData
          })
          return newMap
        })

        console.log(`单个图片上色任务已创建: ${taskId}`)
        console.log('🚀 即将开始轮询上色任务状态...')

        // 开始轮询单个上色任务状态（使用任务ID作为标识）
        pollSingleColoringTask(taskId, taskId, selectedApiType)

        return true
      } else {
        throw new Error(data.message || '创建上色任务失败')
      }

    } catch (error) {
      console.error('单个图片上色失败:', error)
      alert('上色失败: ' + error.message)
      return false
    }
  }

  // 轮询单个上色任务状态
  const pollSingleColoringTask = async (taskId, identifierId, apiType = 'gpt4o') => {
    const pollInterval = 3000 // 每3秒查询一次
    let pollCount = 0
    const maxPolls = 180 // 最多查询9分钟

    console.log(`🚀 开始轮询上色任务: ${taskId}`)

    // 生成轮询实例ID用于调试
    const pollInstanceId = Math.random().toString(36).substr(2, 9)
    console.log(`📋 轮询实例ID: ${pollInstanceId} for 任务: ${taskId}`)

    const poll = async () => {
      try {
        // 暂时移除状态检查，专注于轮询本身
        // 我们先让轮询继续运行，看看是否是状态检查导致的问题
        console.log(`🔄 继续轮询 [实例: ${pollInstanceId}] - 忽略状态检查`)

        // 暂时移除已完成状态检查，让轮询继续进行

        console.log(`🔄 轮询任务 ${taskId} - 第 ${pollCount + 1} 次 [实例: ${pollInstanceId}]`)

        // 使用任务状态查询API，不需要数据库ID
        const apiUrl = `/api/images/task-status/${taskId}?taskType=image-coloring&apiType=${apiType}`
        console.log(`📡 查询任务状态 API: ${apiUrl} [实例: ${pollInstanceId}]`)
        const response = await fetch(apiUrl)
        const data = await response.json()
        console.log(`📡 API响应 [实例: ${pollInstanceId}]:`, data)

        if (data.success) {
          const status = data.data.status

          // 获取API返回的实际进度值，并转换为百分比
          let actualProgress = data.data.progress || 0
          // 如果进度值是0-1之间的小数，转换为0-100的整数
          if (actualProgress <= 1) {
            actualProgress = Math.round(actualProgress * 100)
          }
          // 如果没有实际进度，使用轮询次数估算进度
          const fallbackProgress = Math.min(10 + pollCount * 2, 90) // 从10%开始，每次增加2%，最高90%
          const displayProgress = status === 'completed' ? 100 : (actualProgress > 0 ? actualProgress : fallbackProgress)

          console.log(`📊 更新任务进度: ${taskId} - 状态: ${status}, 实际进度: ${data.data.progress}, 显示进度: ${displayProgress}%`)
          setSingleColoringTasks(prev => {
            const newMap = new Map(prev)
            const currentTask = newMap.get(taskId)
            if (currentTask) {
              newMap.set(taskId, {
                ...currentTask,
                progress: displayProgress,
                status: status,
                message: status === 'completed' ? '上色完成！' : `正在上色中... ${displayProgress}%`
              })
              console.log(`✅ 任务状态已更新: ${taskId}`)
            } else {
              console.warn(`⚠️ 找不到要更新的任务: ${taskId}`)
            }
            return newMap
          })

          if (status === 'completed' && (data.data.coloringUrl || data.data.imageUrl)) {
            console.log(`🎨 检测到任务完成 [实例: ${pollInstanceId}]: ${taskId}`)

            // 获取上色后的图片URL
            const coloringUrl = data.data.coloringUrl || data.data.imageUrl

            console.log(`🎨 上色任务完成，准备更新UI [实例: ${pollInstanceId}]:`, {
              taskId,
              coloringUrl: coloringUrl
            })

            // 使用智能匹配方式更新UI，而不是依赖任务状态
            let foundItem = null

            // 方法1: 通过contentList直接搜索匹配项
            setContentList(prev => prev.map(item => {
              // 尝试多种匹配方式
              const isMatch = (
                // 通过任务ID中的信息匹配（如果taskId包含可识别信息）
                item.imagePath && taskId.includes(item.imagePath.split('/').pop()?.split('.')[0]) ||
                // 通过defaultUrl匹配
                item.defaultUrl && taskId.includes(item.defaultUrl.split('/').pop()?.split('.')[0]) ||
                // 通过item ID匹配（如果有对应关系）
                item.id && taskId.includes(item.id)
              )

              if (isMatch) { // 移除 !item.coloringUrl 条件，允许覆盖已有的上色图片
                console.log(`✅ 通过匹配找到并更新项目 [实例: ${pollInstanceId}]:`, item.id)
                foundItem = item
                return { ...item, coloringUrl: coloringUrl }
              }
              return item
            }))

            // 如果通过上面的方法没找到，尝试更宽松的匹配
            if (!foundItem) {
              console.log(`🔍 使用宽松匹配继续查找 [实例: ${pollInstanceId}]`)
              setContentList(prev => {
                let updated = false
                return prev.map(item => {
                  if (!updated && item.imagePath) { // 移除 !item.coloringUrl 条件，允许覆盖已有的上色图片
                    console.log(`✅ 宽松匹配更新第一个有imagePath的项目 [实例: ${pollInstanceId}]:`, item.id)
                    foundItem = item
                    updated = true
                    return { ...item, coloringUrl: coloringUrl }
                  }
                  return item
                })
              })
            }

            // 如果正在查看详情弹框，同步更新
            if (foundItem && viewingContent && viewingContent.id === foundItem.id) {
              console.log(`🔄 同步更新查看详情弹框数据 [实例: ${pollInstanceId}]`)
              setViewingContent(prev => ({
                ...prev,
                coloringUrl: coloringUrl
              }))
            }

            console.log(`✅ 单个图片上色完成并已更新UI [实例: ${pollInstanceId}]: ${taskId}`)

            // 添加用户友好的成功提示
            alert(`图片上色完成！\n上色结果已自动更新到"上色后图片URL"输入框并显示图片预览。\n\n🔗 新的上色图片URL: ${coloringUrl}`)

            // 任务完成，先更新任务状态为completed，保存结果URL
            setSingleColoringTasks(prev => {
              const newMap = new Map(prev)
              const currentTask = newMap.get(taskId)
              if (currentTask) {
                newMap.set(taskId, {
                  ...currentTask,
                  progress: 100,
                  status: 'completed',
                  message: '上色完成！',
                  coloringUrl: coloringUrl, // 保存结果URL
                  completedAt: new Date(), // 添加完成时间戳
                  shouldDelete: true // 标记应该删除
                })
                console.log(`✅ 任务状态已更新为completed [实例: ${pollInstanceId}]: ${taskId}`)
              }
              return newMap
            })

            // 延迟清除任务记录，确保UI有时间更新和按钮状态恢复
            // 增加延迟时间，确保所有轮询实例都能正常退出
            setTimeout(() => {
              setSingleColoringTasks(prev => {
                const newMap = new Map(prev)
                if (newMap.has(taskId)) {
                  newMap.delete(taskId)
                  console.log(`🧹 已清除上色任务记录: ${taskId}`)
                } else {
                  console.log(`⚠️ 尝试清除不存在的任务: ${taskId}`)
                }
                return newMap
              })
            }, 10000) // 10秒后清除，给足够时间让轮询退出

            return

          } else if (status === 'failed') {
            // 任务失败
            console.error(`单个图片上色失败: ${taskId}`)

            // 清除任务记录
            setSingleColoringTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskId)
              return newMap
            })

            alert('图片上色失败，请重试')
            return

          } else {
            // 任务仍在进行中，继续轮询
            console.log(`🔄 任务仍在进行中: ${taskId}, 状态: ${status}, 将在${pollInterval}ms后继续轮询`)
          }
        } else {
          console.error(`❌ 任务状态查询失败: ${taskId}`, data)
        }

        // 继续轮询
        pollCount++
        if (pollCount < maxPolls) {
          console.log(`⏰ 安排下次轮询: ${taskId} - 第 ${pollCount + 1} 次，${pollInterval}ms后执行 [实例: ${pollInstanceId}]`)
          setTimeout(poll, pollInterval)
        } else {
          console.warn(`单个图片上色任务轮询超时: ${taskId}`)

          // 清除任务记录
          setSingleColoringTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(taskId)
            return newMap
          })

          alert('上色任务查询超时，请稍后检查结果')
        }

      } catch (error) {
        console.error(`查询单个上色任务状态失败: ${taskId}`, error)

        // 继续重试
        pollCount++
        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval)
        } else {
          // 清除任务记录
          setSingleColoringTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(taskId)
            return newMap
          })
        }
      }
    }

    // 开始轮询 - 立即开始第一次查询
    console.log(`⏰ 立即开始第一次轮询: ${taskId}`)
    poll()
  }

  // 检查是否有正在进行的单个上色任务
  const isGeneratingSingleColoring = (formData) => {
    const isGenerating = Array.from(singleColoringTasks.values()).some(task => {
      // 只检查processing状态的任务，不包括completed状态
      if (task.status === 'completed') {
        return false
      }

      // 通过多种方式匹配任务
      if (task.formDataId === formData.id) return true
      if (task.frontendItemId === formData.id) return true
      if (task.defaultUrl && (task.defaultUrl === formData.defaultUrl || task.defaultUrl === formData.imagePath)) return true

      // 通过contentList查找匹配
      const matchingItem = contentList.find(item =>
        item.imagePath === formData.defaultUrl ||
        item.defaultUrl === formData.defaultUrl ||
        item.id === formData.id ||
        item.databaseId === formData.id
      )

      if (matchingItem && (
        task.frontendItemId === matchingItem.id ||
        task.formDataId === matchingItem.id ||
        task.imageId === matchingItem.databaseId ||
        task.defaultUrl === matchingItem.imagePath ||
        task.defaultUrl === matchingItem.defaultUrl
      )) {
        return true
      }

      return false
    })

    console.log(`🔍 检查是否正在生成上色 for ${formData.id}:`, isGenerating)
    return isGenerating
  }

  // 处理文生图
  const handleTextToImage = async (formData) => {
    try {
      console.log('开始文生图生成:', formData)

      // 添加任务状态
      setTextToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: null,
        progress: 0,
        status: 'starting',
        message: '正在创建任务...'
      })))

      // 获取AI提示词（用户输入的提示词）和文生图提示词（通用描述）
      const aiPrompt = formData.prompt?.zh || '生成涂色书图片'  // AI提示词（从用户输入的提示词字段获取）
      const text2imagePromptValue = text2imagePrompt.trim() || '生成适合儿童涂色的黑白线稿，线条简洁清晰，无填充色彩，风格简约卡通'  // 文生图提示词（通用描述），提供默认值

      console.log('🔍 文生图参数调试:')
      console.log('- formData:', formData)
      console.log('- formData.title:', formData.title)
      console.log('- formData.name:', formData.name)
      console.log('- aiPrompt (AI提示词-单张图片描述):', aiPrompt)
      console.log('- text2imagePromptValue (文生图提示词-通用描述):', text2imagePromptValue)

      const requestData = {
        aiPrompt: aiPrompt,  // AI提示词（单张图片描述）
        text2imagePrompt: text2imagePromptValue,  // 文生图提示词（通用描述）
        apiType: selectedApiType,
        model: selectedApiType === 'flux-kontext' ? fluxModel : undefined,
        imageRatio: formData.ratio || '1:1'  // 修正参数名
      }

      console.log('🚀 发送文生图请求数据:', JSON.stringify(requestData, null, 2))

      const response = await fetch('/api/images/text-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (!response.ok) {
        // 更新任务状态为失败
        setTextToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: null,
          progress: 0,
          status: 'failed',
          message: result.error || '文生图生成失败'
        })))
        throw new Error(result.error || '文生图生成失败')
      }

      console.log('文生图任务创建成功:', result)

      // 更新任务状态
      setTextToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: result.data.taskId,
        progress: 10,
        status: 'processing',
        message: '任务已创建，正在生成中...'
      })))

      // 开始轮询任务状态
      if (result.data && result.data.taskId) {
        pollTextToImageTask(result.data.taskId, formData)
      } else {
        throw new Error('API返回的数据中缺少taskId')
      }

    } catch (error) {
      console.error('文生图生成错误:', error)
      // 更新任务状态为失败
      setTextToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: null,
        progress: 0,
        status: 'failed',
        message: error.message
      })))
      alert(`文生图生成失败: ${error.message}`)

      // 3秒后清除失败状态，让用户可以重试
      setTimeout(() => {
        setTextToImageTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(formData.id)
          console.log(`🧹 已清除文生图失败状态: ${formData.id}`)
          return newMap
        })
      }, 3000)
    }
  }

  // 处理图生图
  const handleImageToImage = async (formData, uploadedFile) => {
    try {
      console.log('开始图生图生成:')
      console.log('- formData:', formData)
      console.log('- formData.title:', formData.title)
      console.log('- formData.name:', formData.name)
      console.log('- uploadedFile:', uploadedFile)

      // 添加任务状态
      setImageToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: null,
        progress: 0,
        status: 'starting',
        message: '正在上传图片...'
      })))

      // 创建FormData对象上传图片
      const formDataObj = new FormData()

      // 从用户输入的AI提示词字段获取内容
      let basePromptText = ''
      if (formData.prompt && typeof formData.prompt === 'object') {
        basePromptText = formData.prompt.zh || formData.prompt.en || ''
      } else if (formData.prompt && typeof formData.prompt === 'string') {
        basePromptText = formData.prompt
      }

      // 如果AI提示词为空，尝试从标题获取
      if (!basePromptText || basePromptText.trim() === '') {
        if (formData.title && typeof formData.title === 'object') {
          basePromptText = formData.title.zh || formData.title.en || ''
        } else if (formData.title && typeof formData.title === 'string') {
          basePromptText = formData.title
        }
      }

      // 如果仍然为空，使用默认内容
      if (!basePromptText || basePromptText.trim() === '') {
        basePromptText = '生成涂色书图片'
      }

      // 获取AI提示词（用户输入的提示词）和图生图提示词（通用描述）
      const aiPrompt = basePromptText  // AI提示词（基于用户输入的提示词字段）
      const image2imagePromptValue = imageToImagePrompt.trim() || '将图片转换为适合儿童涂色的黑白线稿，保留主要轮廓，去除细节和色彩，线条简洁清晰'  // 图生图提示词（通用描述），提供默认值

      formDataObj.append('image', uploadedFile)
      formDataObj.append('aiPrompt', basePromptText)  // AI提示词（单张图片描述）
      formDataObj.append('image2imagePrompt', image2imagePromptValue)  // 图生图提示词（通用描述）
      formDataObj.append('apiType', selectedApiType)
      if (selectedApiType === 'flux-kontext' && fluxModel) {
        formDataObj.append('model', fluxModel)
      }
      formDataObj.append('imageRatio', formData.ratio || '1:1')  // 修正参数名

      console.log('准备发送图生图请求:')
      console.log('- 文件:', uploadedFile.name, uploadedFile.size)
      console.log('- aiPrompt (AI提示词-单张图片描述):', basePromptText)
      console.log('- image2imagePrompt (图生图提示词-通用描述):', image2imagePromptValue)
      console.log('- apiType:', selectedApiType)
      console.log('- fluxModel:', fluxModel)
      console.log('- ratio:', formData.ratio || '1:1')

      const response = await fetch('/api/images/image-to-image', {
        method: 'POST',
        body: formDataObj
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('图生图API错误响应:', result)
        // 更新任务状态为失败
        setImageToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: null,
          progress: 0,
          status: 'failed',
          message: result.message || result.error || '图生图生成失败'
        })))
        throw new Error(result.message || result.error || '图生图生成失败')
      }

      console.log('图生图任务创建成功:', result)

      // 如果有用户上传的彩色图片URL，替换之前的blob预览URL
      if (result.data.uploadedColorImageUrl) {
        setContentList(prevList =>
          prevList.map(item => {
            if (item.id === formData.id) {
              // 如果当前是blob URL，释放它
              if (item.colorUrl && item.colorUrl.startsWith('blob:')) {
                URL.revokeObjectURL(item.colorUrl)
                console.log('已释放blob预览URL:', item.colorUrl)
              }

              return {
                ...item,
                colorUrl: result.data.uploadedColorImageUrl,
                uploadedColorUrl: result.data.uploadedColorImageUrl
              }
            }
            return item
          })
        )
        console.log('已保存用户上传的彩色图片URL:', result.data.uploadedColorImageUrl)
      }

      // 更新任务状态
      setImageToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: result.data.taskId,
        progress: 20,
        status: 'processing',
        message: '图片已上传，正在生成中...'
      })))

      // 开始轮询任务状态
      if (result.data && result.data.taskId) {
        pollImageToImageTask(result.data.taskId, formData)
      } else {
        throw new Error('API返回的数据中缺少taskId')
      }

    } catch (error) {
      console.error('图生图生成错误:', error)
      // 更新任务状态为失败
      setImageToImageTasks(prev => new Map(prev.set(formData.id, {
        taskId: null,
        progress: 0,
        status: 'failed',
        message: error.message
      })))
      alert(`图生图生成失败: ${error.message}`)

      // 3秒后清除失败状态，让用户可以重试
      setTimeout(() => {
        setImageToImageTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(formData.id)
          console.log(`🧹 已清除图生图失败状态: ${formData.id}`)
          return newMap
        })
      }, 3000)
    }
  }

  // 轮询文生图任务状态
  const pollTextToImageTask = async (taskId, formData) => {
    const maxAttempts = 60 // 最多轮询60次（约5分钟）
    let attempts = 0

    const poll = async () => {
      try {
        attempts++
        console.log(`轮询文生图任务状态 ${attempts}/${maxAttempts}:`, taskId)

        const response = await fetch(`/api/images/task-status/${taskId}?taskType=text-to-image`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '获取任务状态失败')
        }

        console.log('文生图任务状态:', result)
        console.log('文生图任务状态详细信息:', {
          status: result.data?.status,
          imageUrl: result.data?.imageUrl,
          hasImageUrl: !!result.data?.imageUrl
        })

        // 更新进度
        const progress = Math.min(10 + attempts * 1.5, 90)
        setTextToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: taskId,
          progress: progress,
          status: 'processing',
          message: `正在生成中... (${attempts}/${maxAttempts})`
        })))

        if (result.data && result.data.status === 'completed' && result.data.imageUrl) {
          // 任务完成，更新状态
          setTextToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 100,
            status: 'completed',
            message: '生成完成！'
          })))

          // 更新contentList中对应的项目
          console.log(`📝 文生图完成，准备更新contentList:`)
          console.log('- formData.id:', formData.id)
          console.log('- result.data.imageUrl:', result.data.imageUrl)

          setContentList(prevList => {
            const updatedList = prevList.map(item => {
              if (item.id === formData.id) {
                console.log(`✅ 找到匹配项目，更新imagePath和defaultUrl:`)
                console.log('- 更新前 item.imagePath:', item.imagePath)
                console.log('- 更新前 item.defaultUrl:', item.defaultUrl)
                console.log('- 新的imageUrl:', result.data.imageUrl)

                return {
                  ...item,
                  imagePath: result.data.imageUrl,
                  defaultUrl: result.data.imageUrl
                }
              }
              return item
            })

            // 验证更新结果
            const updatedItem = updatedList.find(item => item.id === formData.id)
            console.log(`🔍 文生图更新后的项目:`, updatedItem)

            return updatedList
          })

          console.log('文生图生成完成:', result.data.imageUrl)
          console.log('更新formData.id:', formData.id)

          // 验证更新是否成功
          setTimeout(() => {
            setContentList(currentList => {
              const updatedItem = currentList.find(item => item.id === formData.id)
              console.log('文生图更新后的contentList项目:', updatedItem)
              return currentList
            })
          }, 100)

          alert('文生图生成成功！')

          // 3秒后清除任务状态
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              return newMap
            })
          }, 3000)

          return
        } else if (result.data && result.data.status === 'failed') {
          // 更新任务状态为失败
          setTextToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: result.data.error || '文生图生成失败'
          })))

          alert(`文生图生成失败: ${result.data.error || '未知错误'}`)

          // 3秒后清除失败状态，让用户可以重试
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              console.log(`🧹 已清除文生图失败状态: ${formData.id}`)
              return newMap
            })
          }, 3000)

          return
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000) // 3秒后再次轮询
        } else {
          // 超时处理
          setTextToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: '文生图生成超时'
          })))

          alert('文生图生成超时，请重试')

          // 3秒后清除超时状态
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              console.log(`🧹 已清除文生图超时状态: ${formData.id}`)
              return newMap
            })
          }, 3000)
        }

      } catch (error) {
        console.error('轮询文生图任务失败:', error)

        // 更新任务状态为失败
        setTextToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: taskId,
          progress: 0,
          status: 'failed',
          message: error.message || '网络错误'
        })))

        alert(`文生图生成失败: ${error.message}`)

        // 3秒后清除失败状态
        setTimeout(() => {
          setTextToImageTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(formData.id)
            console.log(`🧹 已清除文生图网络错误状态: ${formData.id}`)
            return newMap
          })
        }, 3000)
      }
    }

    // 开始轮询
    poll()
  }

  // 轮询图生图任务状态
  const pollImageToImageTask = async (taskId, formData) => {
    const maxAttempts = 60 // 最多轮询60次（约5分钟）
    let attempts = 0

    const poll = async () => {
      try {
        attempts++
        console.log(`轮询图生图任务状态 ${attempts}/${maxAttempts}:`, taskId)

        const response = await fetch(`/api/images/task-status/${taskId}?taskType=image-to-image`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || '获取任务状态失败')
        }

        console.log('图生图任务状态:', result)
        console.log('图生图任务状态详细信息:', {
          status: result.data?.status,
          imageUrl: result.data?.imageUrl,
          hasImageUrl: !!result.data?.imageUrl
        })

        // 更新进度
        const progress = Math.min(20 + attempts * 1.3, 90)
        setImageToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: taskId,
          progress: progress,
          status: 'processing',
          message: `正在生成中... (${attempts}/${maxAttempts})`
        })))

        if (result.data && result.data.status === 'completed' && result.data.imageUrl) {
          // 任务完成，更新状态
          setImageToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 100,
            status: 'completed',
            message: '生成完成！'
          })))

          // 更新contentList中对应的项目
          console.log(`📝 图生图完成，准备更新contentList:`)
          console.log('- formData.id:', formData.id)
          console.log('- result.data.imageUrl:', result.data.imageUrl)

          setContentList(prevList => {
            const updatedList = prevList.map(item => {
              if (item.id === formData.id) {
                console.log(`✅ 找到匹配项目，更新imagePath和defaultUrl:`)
                console.log('- 更新前 item.imagePath:', item.imagePath)
                console.log('- 更新前 item.defaultUrl:', item.defaultUrl)
                console.log('- 更新前 item.colorUrl:', item.colorUrl)
                console.log('- 新的imageUrl:', result.data.imageUrl)

                return {
                  ...item,
                  imagePath: result.data.imageUrl,
                  defaultUrl: result.data.imageUrl,
                  // 保留之前可能保存的彩色图片URL
                  colorUrl: item.colorUrl || item.uploadedColorUrl
                }
              }
              return item
            })

            // 验证更新结果
            const updatedItem = updatedList.find(item => item.id === formData.id)
            console.log(`🔍 图生图更新后的项目:`, updatedItem)

            return updatedList
          })

          console.log('图生图生成完成，更新defaultUrl:', result.data.imageUrl)
          console.log('更新formData.id:', formData.id)

          // 验证更新是否成功
          setTimeout(() => {
            setContentList(currentList => {
              const updatedItem = currentList.find(item => item.id === formData.id)
              console.log('更新后的contentList项目:', updatedItem)
              return currentList
            })
          }, 100)

          alert('图生图生成成功！')

          // 3秒后清除任务状态
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              return newMap
            })
          }, 3000)

          return
        } else if (result.data && result.data.status === 'failed') {
          // 更新任务状态为失败
          setImageToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: result.data.error || '图生图生成失败'
          })))

          alert(`图生图生成失败: ${result.data.error || '未知错误'}`)

          // 3秒后清除失败状态，让用户可以重试
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              console.log(`🧹 已清除图生图失败状态: ${formData.id}`)
              return newMap
            })
          }, 3000)

          return
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000) // 3秒后再次轮询
        } else {
          // 超时处理
          setImageToImageTasks(prev => new Map(prev.set(formData.id, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: '图生图生成超时'
          })))

          alert('图生图生成超时，请重试')

          // 3秒后清除超时状态
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(formData.id)
              console.log(`🧹 已清除图生图超时状态: ${formData.id}`)
              return newMap
            })
          }, 3000)
        }

      } catch (error) {
        console.error('轮询图生图任务失败:', error)

        // 更新任务状态为失败
        setImageToImageTasks(prev => new Map(prev.set(formData.id, {
          taskId: taskId,
          progress: 0,
          status: 'failed',
          message: error.message || '网络错误'
        })))

        alert(`图生图生成失败: ${error.message}`)

        // 3秒后清除失败状态
        setTimeout(() => {
          setImageToImageTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(formData.id)
            console.log(`🧹 已清除图生图网络错误状态: ${formData.id}`)
            return newMap
          })
        }, 3000)
      }
    }

    // 开始轮询
    poll()
  }

  // 检查是否有正在进行的文生图任务
  const isGeneratingTextToImage = (formData) => {
    const task = textToImageTasks.get(formData.id)
    return task && (task.status === 'starting' || task.status === 'processing')
  }

  // 检查是否有正在进行的图生图任务
  const isGeneratingImageToImage = (formData) => {
    const task = imageToImageTasks.get(formData.id)
    return task && (task.status === 'starting' || task.status === 'processing')
  }

  // 获取文生图任务状态
  const getTextToImageTaskStatus = (formData) => {
    return textToImageTasks.get(formData.id)
  }

  // 获取图生图任务状态
  const getImageToImageTaskStatus = (formData) => {
    return imageToImageTasks.get(formData.id)
  }

  // 获取上色任务状态
  const getColoringTaskStatus = (formData) => {
    // 通过多种方式查找上色任务状态
    for (const [taskId, task] of singleColoringTasks) {
      // 详细的匹配逻辑，确保能找到对应的任务
      const isMatch = (
        task.formDataId === formData.id ||
        task.frontendItemId === formData.id ||
        task.defaultUrl === formData.defaultUrl ||
        task.defaultUrl === formData.imagePath ||
        // 通过contentList进行额外匹配
        (() => {
          const matchingItem = contentList.find(item =>
            item.id === formData.id ||
            item.imagePath === formData.defaultUrl ||
            item.defaultUrl === formData.defaultUrl
          )
          return matchingItem && (
            task.frontendItemId === matchingItem.id ||
            task.formDataId === matchingItem.id ||
            task.imageId === matchingItem.databaseId ||
            task.defaultUrl === matchingItem.imagePath ||
            task.defaultUrl === matchingItem.defaultUrl
          )
        })()
      )

      if (isMatch) {
        // 构造状态对象，类似于文生图和图生图的格式
        const status = {
          taskId: taskId,
          progress: task.progress || 0,
          status: task.status || 'processing',
          message: task.message || '正在上色中...',
          coloringUrl: task.coloringUrl // 添加结果URL
        }

        console.log(`🔍 找到上色任务状态 for ${formData.id}:`, status)
        return status
      }
    }

    console.log(`🔍 未找到上色任务状态 for ${formData.id}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[90rem] mx-auto">
        {/* 导航栏 */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold">涂色书管理系统</h1>
            <div className="flex items-center gap-2">
              {/* 页面导航按钮 */}
              <div className="flex gap-2">
                <Button
                  variant={currentPage === 'generator' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('generator')}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  图片生成
                </Button>
                <Button
                  variant={currentPage === 'images' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('images')}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  图片管理
                </Button>
                <Button
                  variant={currentPage === 'categories' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('categories')}
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  分类管理
                </Button>
                <Button
                  variant={currentPage === 'tags' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('tags')}
                  className="flex items-center gap-2"
                >
                  <Tag className="w-4 h-4" />
                  标签管理
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 pb-6">
          {/* 根据当前页面显示不同内容 */}
          {currentPage === 'generator' ? (
            <div>

              {/* 步骤1：基础设置 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold flex items-center justify-center text-sm">1</div>
                    基础设置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 基础设置 - 一排4个 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="keyword" className="text-sm font-medium">关键词 *</Label>
                      <Input
                        id="keyword"
                        placeholder="如：蜘蛛侠、超人、蝴蝶等"
                        value={formData.keyword}
                        onChange={(e) => handleInputChange('keyword', e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">附加描述（可选）</Label>
                      <Input
                        id="description"
                        placeholder="对关键词的补充描述"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="count" className="text-sm font-medium">生成数量</Label>
                      <Input
                        id="count"
                        type="number"
                        min="1"
                        max="20"
                        value={formData.count}
                        onChange={(e) => handleInputChange('count', parseInt(e.target.value) || 1)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="globalImageRatio" className="text-sm font-medium">图片比例</Label>
                      <Select value={globalImageRatio} onValueChange={setGlobalImageRatio}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="21:9">超宽屏 (21:9)</SelectItem>
                          <SelectItem value="16:9">宽屏 (16:9)</SelectItem>
                          <SelectItem value="4:3">横向 (4:3)</SelectItem>
                          <SelectItem value="1:1">正方形 (1:1)</SelectItem>
                          <SelectItem value="3:4">纵向 (3:4)</SelectItem>
                          <SelectItem value="9:16">竖屏 (9:16)</SelectItem>
                          <SelectItem value="16:21">超高屏 (16:21)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 模型和API设置 - 一排4个 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="model" className="text-sm font-medium">文案模型</Label>
                      <Select value={formData.model} onValueChange={(value) => handleInputChange('model', value)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                          <SelectItem value="gpt-4">GPT-4</SelectItem>
                          <SelectItem value="claude-3-haiku">Claude-3 Haiku</SelectItem>
                          <SelectItem value="deepseek-chat">DeepSeek Chat</SelectItem>
                          <SelectItem value="deepseek-coder">DeepSeek Coder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apiType" className="text-sm font-medium">图像生成API</Label>
                      <Select value={selectedApiType} onValueChange={setSelectedApiType}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt4o">GPT-4O 图像生成</SelectItem>
                          <SelectItem value="flux-kontext">Flux Kontext 图像生成</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedApiType === 'flux-kontext' ? (
                      <div className="space-y-2">
                        <Label htmlFor="fluxModel" className="text-sm font-medium">Flux 模型</Label>
                        <Select value={fluxModel} onValueChange={setFluxModel}>
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flux-kontext-pro">Flux Kontext Pro (标准)</SelectItem>
                            <SelectItem value="flux-kontext-max">Flux Kontext Max (增强)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div></div>
                    )}

                    <div></div>
                  </div>

                  {/* 提示词设置 - 一排2个 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 左侧：图像生成提示词 */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="text2imagePrompt" className="text-sm font-medium">文生图提示词（用于指导AI如何从文字生成涂色线稿图片）</Label>
                        <Textarea
                          id="text2imagePrompt"
                          placeholder="输入文生图提示词，留空将使用默认提示词"
                          value={text2imagePrompt}
                          onChange={(e) => setText2imagePrompt(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageToImagePrompt" className="text-sm font-medium">图生图提示词（用于指导AI如何将彩色图片转换为涂色线稿）</Label>
                        <Textarea
                          id="imageToImagePrompt"
                          placeholder="输入图生图提示词，留空将使用默认提示词"
                          value={imageToImagePrompt}
                          onChange={(e) => setImageToImagePrompt(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coloringPrompt" className="text-sm font-medium">图片上色提示词（用于指导AI如何为图片上色）</Label>
                        <Textarea
                          id="coloringPrompt"
                          placeholder="输入上色提示词，留空将使用默认提示词"
                          value={coloringPrompt}
                          onChange={(e) => setColoringPrompt(e.target.value)}
                          rows={3}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>

                    {/* 右侧：AI生成提示词 */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="themeTemplate" className="text-sm font-medium">AI主题生成提示词</Label>
                          <div className="flex gap-2">
                            <Select value={themeTemplatePresets[0].content} onValueChange={(value) => handleInputChange('themeTemplate', value)}>
                              <SelectTrigger className="h-6 w-40 text-xs">
                                <SelectValue placeholder="选择预设提示词" />
                              </SelectTrigger>
                              <SelectContent>
                                {themeTemplatePresets.map((preset, index) => (
                                  <SelectItem key={index} value={preset.content} className="text-xs">
                                    {preset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInputChange('themeTemplate', '')}
                              className="text-xs h-6 px-2"
                            >
                              清空
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          id="themeTemplate"
                          placeholder="输入自定义AI提示词，用于生成主题内容。使用 ${keyword}、${description}、${count} 作为占位符"
                          value={formData.themeTemplate}
                          onChange={(e) => handleInputChange('themeTemplate', e.target.value)}
                          rows={8}
                          className="resize-none text-sm"
                        />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• 使用 <code className="bg-gray-100 px-1 rounded">{'${keyword}'}</code>、<code className="bg-gray-100 px-1 rounded">{'${description}'}</code>、<code className="bg-gray-100 px-1 rounded">{'${count}'}</code> 作为占位符</p>
                          <p>• 这个提示词将发送给AI来生成主题列表，留空时将使用系统默认提示词</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="template" className="text-sm font-medium">AI文案生成提示词</Label>
                          <div className="flex gap-2">
                            <Select value={templatePresets[0].content} onValueChange={(value) => handleInputChange('template', value)}>
                              <SelectTrigger className="h-6 w-40 text-xs">
                                <SelectValue placeholder="选择预设提示词" />
                              </SelectTrigger>
                              <SelectContent>
                                {templatePresets.map((preset, index) => (
                                  <SelectItem key={index} value={preset.content} className="text-xs">
                                    {preset.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInputChange('template', '')}
                              className="text-xs h-6 px-2"
                            >
                              清空
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          id="template"
                          placeholder="输入自定义AI提示词，用于生成文案内容。使用 ${keyword}、${title}、${prompt} 作为占位符"
                          value={formData.template}
                          onChange={(e) => handleInputChange('template', e.target.value)}
                          rows={8}
                          className="resize-none text-sm"
                        />
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>• 使用 <code className="bg-gray-100 px-1 rounded">{'${keyword}'}</code>、<code className="bg-gray-100 px-1 rounded">{'${title}'}</code>、<code className="bg-gray-100 px-1 rounded">{'${prompt}'}</code> 作为占位符</p>
                          <p>• 这个提示词将发送给AI来生成具体的文案内容，留空时将使用系统默认提示词</p>
                        </div>
                      </div>
                    </div>
                  </div>


                </CardContent>
              </Card>

              {/* 步骤2：生成流程 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 font-semibold flex items-center justify-center text-sm">2</div>
                    生成流程
                  </CardTitle>
                </CardHeader>
                <CardContent>

                  {/* 步骤按钮 */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* 第一步：生成主题 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
                          <PlusCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-medium text-blue-900 mb-2">生成主题</h3>
                        <p className="text-sm text-blue-700 mb-4">根据关键词生成多个创意主题</p>
                        <Button
                          onClick={generateThemes}
                          disabled={isGeneratingThemes || !formData.keyword.trim()}
                          className="w-full"
                          size="sm"
                        >
                          {isGeneratingThemes ? '生成中...' : '开始生成'}
                        </Button>
                      </div>
                    </div>

                    {/* 第二步：生成文案 */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                          <Edit3 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-medium text-green-900 mb-2">生成文案</h3>
                        <p className="text-sm text-green-700 mb-4">为主题创建详细的涂色指导</p>

                        <Button
                          onClick={() => generateContent(true)} // 始终重新生成所有文案
                          disabled={isGeneratingContent || contentList.length === 0}
                          variant="outline"
                          className="w-full border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2"
                          size="sm"
                        >
                          <Edit3 className="w-4 h-4" />
                          {isGeneratingContent ? '生成中...' : '生成文案'}
                        </Button>
                      </div>
                    </div>

                    {/* 第三步：生成国际化 */}
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-teal-100 rounded-full flex items-center justify-center">
                          <Languages className="w-6 h-6 text-teal-600" />
                        </div>
                        <h3 className="font-medium text-teal-900 mb-2">生成国际化</h3>
                        <p className="text-sm text-teal-700 mb-2">为所有内容生成多语言版本</p>
                        <p className="text-xs text-teal-600 mb-4">
                          已选择 {selectedLanguages.length} 种语言
                          {selectedLanguages.length > 0 && ': ' + selectedLanguages.map(lang =>
                            supportedLanguages.find(l => l.code === lang)?.name || lang
                          ).join(', ')}
                        </p>

                        {/* 语言选择区域 */}
                        <div className="mb-3">
                          <div className="min-w-full">
                            <MultiSelect
                              options={languageOptions}
                              value={selectedLanguages}
                              onChange={setSelectedLanguages}
                              placeholder="选择目标语言"
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={generateInternationalization}
                          disabled={isGeneratingInternationalization || selectedLanguages.length === 0 || !contentList.some(item => item.content)}
                          variant="outline"
                          className="w-full border-teal-300 text-teal-700 hover:bg-teal-50 flex items-center gap-2"
                          size="sm"
                        >
                          <Languages className="w-4 h-4" />
                          {isGeneratingInternationalization ? '生成中...' : '生成国际化'}
                        </Button>
                      </div>
                    </div>

                    {/* 第四步：生成图片 */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                          <Image className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-medium text-purple-900 mb-2">生成图片</h3>
                        <p className="text-sm text-purple-700 mb-2">AI生成专业涂色页图片</p>
                        <p className="text-xs text-purple-600 mb-4">
                          当前API: {selectedApiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'}
                          {selectedApiType === 'flux-kontext' && ` (${fluxModel === 'flux-kontext-pro' ? 'Pro' : 'Max'})`}
                        </p>

                        <Button
                          onClick={generateImages}
                          disabled={isGeneratingImages || contentList.length === 0}
                          variant="outline"
                          className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
                          size="sm"
                        >
                          {isGeneratingImages ? '生成中...' : '生成图片'}
                        </Button>
                      </div>
                    </div>

                    {/* 第五步：图片上色 */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                          <Palette className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="font-medium text-orange-900 mb-2">图片上色</h3>
                        <p className="text-sm text-orange-700 mb-2">为线稿图生成马克笔上色版本</p>
                        <p className="text-xs text-orange-600 mb-4">
                          当前API: {selectedApiType === 'flux-kontext' ? 'Flux Kontext' : 'GPT-4O'}
                          {selectedApiType === 'flux-kontext' && ` (${fluxModel === 'flux-kontext-pro' ? 'Pro' : 'Max'})`}
                        </p>
                        <Button
                          onClick={handleBatchColoring}
                          disabled={!contentList.some(item => item.imagePath) || isGeneratingColoring}
                          variant="outline"
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                          size="sm"
                        >
                          {isGeneratingColoring ? '上色中...' : '开始上色'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 图片生成控制按钮 */}
                  {isGeneratingImages && currentImageTaskId && (
                    <div className="mt-4 flex justify-center gap-2">
                      {imageProgress?.status === 'paused' ? (
                        <Button
                          onClick={resumeImageGeneration}
                          variant="outline"
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          恢复生成
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseImageGeneration}
                          variant="outline"
                          className="flex items-center gap-2"
                          size="sm"
                        >
                          <Clock className="w-4 h-4" />
                          暂停生成
                        </Button>
                      )}
                    </div>
                  )}

                  {/* 生成进度显示 */}
                  {generationProgress && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-blue-900">
                          {generationProgress.message}
                        </span>
                        <span className="text-sm text-blue-700 font-mono">
                          {generationProgress.current}/{generationProgress.totalSteps || generationProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${(generationProgress.current / (generationProgress.totalSteps || generationProgress.total)) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* 图片生成进度显示 */}
                  {imageProgress && (
                    <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-900 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          {getDisplayText(imageProgress.message)}
                          {imageProgress.status === 'paused' && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">已暂停</span>
                          )}
                        </span>
                        <span className="text-sm text-purple-700">
                          {imageProgress.current}/{imageProgress.total}
                          {imageProgress.currentBatch && imageProgress.totalBatches && (
                            <span className="ml-2 text-xs">
                              (批次: {imageProgress.currentBatch}/{imageProgress.totalBatches})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${(imageProgress.current / imageProgress.total) * 100}%`
                          }}
                        ></div>
                      </div>

                      {/* 详细进度 - 每张图片的状态 */}
                      {imageProgress.details && Object.keys(imageProgress.details).length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-purple-800">各图片生成状态：</div>
                          {Object.entries(imageProgress.details).map(([itemId, detail]) => {
                            const item = contentList.find(c => c.id === itemId)
                            if (!item) return null

                            return (
                              <div key={itemId} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">#{contentList.indexOf(item) + 1}</span>
                                  <span className="text-gray-500 truncate max-w-40">{getDisplayText(detail.title)}</span>
                                  <span className="text-gray-400 text-xs">({detail.imageRatio || '1:1'})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {detail.status === 'pending' && (
                                    <>
                                      <div className="w-3 h-3 bg-gray-300 rounded-full" />
                                      <span className="text-gray-500">等待中</span>
                                    </>
                                  )}
                                  {detail.status === 'generating' && (
                                    <>
                                      <Clock className="w-3 h-3 text-yellow-500" />
                                      <div className="flex items-center gap-2">
                                        <span className="text-yellow-700">
                                          {detail.progress > 0 ? `${detail.progress}%` : '生成中'}
                                        </span>
                                        {detail.progress > 0 && (
                                          <div className="w-12 bg-yellow-200 rounded-full h-1">
                                            <div
                                              className="bg-yellow-600 h-1 rounded-full transition-all duration-300"
                                              style={{ width: `${detail.progress}%` }}
                                            ></div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {detail.status === 'completed' && (
                                    <>
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                      <span className="text-green-700">已完成</span>
                                    </>
                                  )}
                                  {detail.status === 'error' && (
                                    <>
                                      <AlertCircle className="w-3 h-3 text-red-500" />
                                      <span className="text-red-700 truncate max-w-24" title={detail.error}>失败</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 上色进度显示 */}
                  {coloringProgress && (
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-orange-900 flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          {coloringProgress.message}
                        </span>
                        <span className="text-sm text-orange-700">
                          {coloringProgress.current}/{coloringProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${(coloringProgress.current / coloringProgress.total) * 100}%`
                          }}
                        ></div>
                      </div>

                      {/* 详细进度 - 每张图片的上色状态 */}
                      {coloringProgress.details && Object.keys(coloringProgress.details).length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs font-medium text-orange-800">各图片上色状态：</div>
                          {Object.entries(coloringProgress.details).map(([itemId, detail]) => {
                            const item = contentList.find(c => c.id === itemId)
                            if (!item) return null

                            return (
                              <div key={itemId} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600">#{contentList.indexOf(item) + 1}</span>
                                  <span className="text-gray-500 truncate max-w-40">{detail.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {detail.status === 'processing' && (
                                    <>
                                      <Palette className="w-3 h-3 text-orange-500" />
                                      <div className="flex items-center gap-2">
                                        <span className="text-orange-700">
                                          {detail.progress > 0 ? `${detail.progress}%` : '上色中'}
                                        </span>
                                        {detail.progress > 0 && (
                                          <div className="w-12 bg-orange-200 rounded-full h-1">
                                            <div
                                              className="bg-orange-600 h-1 rounded-full transition-all duration-300"
                                              style={{ width: `${detail.progress}%` }}
                                            ></div>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                  {detail.status === 'completed' && (
                                    <>
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                      <span className="text-green-700">上色完成</span>
                                    </>
                                  )}
                                  {detail.status === 'error' && (
                                    <>
                                      <AlertCircle className="w-3 h-3 text-red-500" />
                                      <span className="text-red-700 truncate max-w-24" title={detail.message}>上色失败</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}


                </CardContent>
              </Card>

              {/* 步骤3：保存设置（有内容时显示） */}
              {contentList.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-semibold flex items-center justify-center text-sm">3</div>
                      保存设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={toggleSelectAll}
                        variant="outline"
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {selectedImages.size === contentList.length ? '取消全选' : '全选'}
                      </Button>

                      <Button
                        onClick={handleSaveImages}
                        disabled={selectedImages.size === 0 || isSaving}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? '保存中...' : (() => {
                          const selectedItems = contentList.filter(item => selectedImages.has(item.id))
                          const newItems = selectedItems.filter(item => !item.databaseId).length
                          const updateItems = selectedItems.filter(item => item.databaseId).length

                          if (newItems > 0 && updateItems > 0) {
                            return `保存 (${selectedImages.size}) - 新增${newItems},更新${updateItems}`
                          } else if (newItems > 0) {
                            return `新增到数据库 (${newItems})`
                          } else if (updateItems > 0) {
                            return `更新数据库 (${updateItems})`
                          } else {
                            return `保存到数据库 (${selectedImages.size})`
                          }
                        })()}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 生成的内容列表 */}
              {contentList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-semibold flex items-center justify-center text-sm">4</div>
                      生成的内容 ({contentList.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {contentList.map((item) => (
                        <div key={item.id} className="border rounded-lg p-4 hover:border-blue-200 transition-colors bg-white">
                          {/* 第一行：选择框、标题、状态 */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* 选择checkbox */}
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedImages.has(item.id)}
                                  onChange={() => toggleImageSelection(item.id)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </label>

                              {/* 序号 */}
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 flex-shrink-0">
                                #{item.index}
                              </span>

                              {/* 标题 */}
                              <div className="flex-1 min-w-0">
                                {editingId === item.id && editingField === 'title' ? (
                                  <div className="flex gap-2">
                                    <Input
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      className="flex-1 h-8"
                                    />
                                    <Button size="sm" onClick={saveEdit} className="h-8 w-8 p-0">
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 w-8 p-0">
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium text-gray-900 truncate">
                                      {getDisplayText(item.name || item.title)}
                                    </h3>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 状态和操作按钮 */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* 状态指示器 */}
                              {item.content === null ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                  仅主题
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  ✓ 文案完成
                                </span>
                              )}

                              {item.imagePath ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  图片完成
                                </span>
                              ) : imageProgress?.details?.[item.id]?.status === 'generating' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                  <Clock className="w-3 h-3 mr-1" />
                                  生成中
                                </span>
                              ) : imageProgress?.details?.[item.id]?.status === 'error' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  失败
                                </span>
                              ) : null}

                              {/* 上色状态指示器 */}
                              {item.coloringUrl ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                  <ImageIcon className="w-3 h-3 mr-1" />
                                  上色完成
                                </span>
                              ) : coloringProgress?.details?.[item.id]?.status === 'processing' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                                  <Clock className="w-3 h-3 mr-1" />
                                  上色中
                                </span>
                              ) : coloringProgress?.details?.[item.id]?.status === 'error' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  上色失败
                                </span>
                              ) : null}

                              {/* 数据库保存状态 */}
                              {item.databaseId ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  已保存
                                </span>
                              ) : item.savedToDatabase ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  已保存
                                </span>
                              ) : null}
                              {/* 删除按钮 */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContent(item.id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {/* 详细信息区域 - 使用ImageForm组件 */}
                          <div className="mt-4 border-t pt-4">
                            <ImageForm
                              formData={convertItemToFormData(item)}
                              editingLanguages={getContentEditingLanguages(item.id, item)} // 使用独立的编辑语言状态
                              supportedLanguages={supportedLanguages}
                              categories={saveOptions.categories}
                              tags={saveOptions.tags}
                              typeOptions={[
                                { value: 'text2image', label: '文字生成图片' },
                                { value: 'image2image', label: '图片转图片' },
                                { value: 'image2coloring', label: '图片转涂色' }
                              ]}
                              ratioOptions={[
                                { value: '21:9', label: '超宽屏 (21:9)' },
                                { value: '16:9', label: '宽屏 (16:9)' },
                                { value: '4:3', label: '横向 (4:3)' },
                                { value: '1:1', label: '正方形 (1:1)' },
                                { value: '3:4', label: '纵向 (3:4)' },
                                { value: '9:16', label: '竖屏 (9:16)' },
                                { value: '16:21', label: '超高屏 (16:21)' }
                              ]}
                              loading={false}
                              onInputChange={(field, lang, value) => handleContentFormChange(item.id, field, lang, value)}
                              onAddLanguage={(lang) => {
                                // 添加语言到编辑状态
                                addLanguageToContent(item.id, lang)

                                // 为特定项目添加语言支持
                                setContentList(prevList =>
                                  prevList.map(listItem => {
                                    if (listItem.id === item.id) {
                                      const updatedItem = { ...listItem }
                                      // 为每个多语言字段添加新语言的空值
                                      const multiLangFields = ['name', 'title', 'description', 'prompt', 'content']
                                      multiLangFields.forEach(field => {
                                        if (updatedItem[field]) {
                                          if (typeof updatedItem[field] === 'string') {
                                            // 如果是字符串，转换为对象
                                            updatedItem[field] = { zh: updatedItem[field], [lang]: '' }
                                          } else if (typeof updatedItem[field] === 'object') {
                                            // 如果已经是对象，添加新语言
                                            updatedItem[field] = { ...updatedItem[field], [lang]: '' }
                                          }
                                        } else {
                                          // 如果字段不存在，创建包含中文和新语言的对象
                                          updatedItem[field] = { zh: '', [lang]: '' }
                                        }
                                      })
                                      return updatedItem
                                    }
                                    return listItem
                                  })
                                )
                              }}
                              onRemoveLanguage={(lang) => {
                                // 从编辑状态移除语言
                                removeLanguageFromContent(item.id, lang)

                                // 从特定项目移除语言支持（除了中文）
                                if (lang === 'zh') return // 不允许删除中文
                                setContentList(prevList =>
                                  prevList.map(listItem => {
                                    if (listItem.id === item.id) {
                                      const updatedItem = { ...listItem }
                                      // 从每个多语言字段移除指定语言
                                      const multiLangFields = ['name', 'title', 'description', 'prompt', 'content']
                                      multiLangFields.forEach(field => {
                                        if (updatedItem[field] && typeof updatedItem[field] === 'object') {
                                          const { [lang]: removed, ...rest } = updatedItem[field]
                                          updatedItem[field] = rest
                                        }
                                      })
                                      return updatedItem
                                    }
                                    return listItem
                                  })
                                )
                              }}
                              onSubmit={() => { }} // 不显示提交按钮
                              onCancel={() => { }} // 不显示取消按钮
                              formatMultiLangField={formatMultiLangField}
                              showButtons={false} // 不显示操作按钮
                              readOnly={false} // 设置为可编辑模式
                              className="scale-90 origin-top -mb-20" // 缩小以适应卡片，减少底部空白
                              onGenerateColoring={handleSingleImageColoring} // 添加上色回调
                              isGeneratingColoring={isGeneratingSingleColoring(convertItemToFormData(item))} // 添加上色状态
                              coloringTaskStatus={getColoringTaskStatus(convertItemToFormData(item))} // 添加上色任务状态
                              onTextToImage={handleTextToImage} // 添加文生图回调
                              isGeneratingTextToImage={isGeneratingTextToImage(convertItemToFormData(item))} // 添加文生图状态
                              textToImageTaskStatus={getTextToImageTaskStatus(convertItemToFormData(item))} // 添加文生图任务状态
                              onImageToImage={handleImageToImage} // 添加图生图回调
                              isGeneratingImageToImage={isGeneratingImageToImage(convertItemToFormData(item))} // 添加图生图状态
                              imageToImageTaskStatus={getImageToImageTaskStatus(convertItemToFormData(item))} // 添加图生图任务状态
                              onGenerateTranslation={(imageId, languageCode, formData) => handleGenerateTranslation(imageId, languageCode, item)} // 添加翻译回调
                              isGeneratingTranslation={isGeneratingTranslation} // 添加翻译状态检查函数
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : currentPage === 'categories' ? (
            <CategoriesManager />
          ) : currentPage === 'tags' ? (
            <TagsManager />
          ) : currentPage === 'images' ? (
            <ImagesManager />
          ) : null}
        </div>

        {/* 查看详情对话框 */}
        {showDetailDialog && viewingContent && (
          <Dialog
            isOpen={showDetailDialog}
            onClose={closeDetailDialog}
            title="查看生成内容详情"
            maxWidth="max-w-6xl"
          >
            <DialogContent>
              <ImageForm
                formData={viewingContent}
                editingLanguages={viewingContent ? getContentEditingLanguages(viewingContent.id, viewingContent) : ['zh']}
                supportedLanguages={supportedLanguages}
                categories={saveOptions.categories}
                tags={saveOptions.tags}
                typeOptions={[
                  { value: 'text2image', label: '文字生成图片' },
                  { value: 'image2image', label: '图片转图片' },
                  { value: 'image2coloring', label: '图片转涂色' }
                ]}
                ratioOptions={[
                  { value: '21:9', label: '超宽屏 (21:9)' },
                  { value: '16:9', label: '宽屏 (16:9)' },
                  { value: '4:3', label: '横向 (4:3)' },
                  { value: '1:1', label: '正方形 (1:1)' },
                  { value: '3:4', label: '纵向 (3:4)' },
                  { value: '9:16', label: '竖屏 (9:16)' },
                  { value: '16:21', label: '超高屏 (16:21)' }
                ]}
                loading={false}
                onInputChange={(field, lang, value) => {
                  // 更新查看详情的数据
                  setViewingContent(prev => {
                    if (field === 'hotness') {
                      return { ...prev, hotness: value }
                    } else if (field === 'coloringUrl') {
                      return { ...prev, coloringUrl: value }
                    } else if (field === 'colorUrl') {
                      return { ...prev, colorUrl: value }
                    } else if (field === 'defaultUrl') {
                      return { ...prev, defaultUrl: value }
                    } else if (field === 'ratio') {
                      return { ...prev, ratio: value }
                    } else if (field === 'type') {
                      return { ...prev, type: value }
                    } else if (field === 'isPublic') {
                      return { ...prev, isPublic: value }
                    } else if (lang) {
                      // 处理多语言字段
                      return {
                        ...prev,
                        [field]: {
                          ...prev[field],
                          [lang]: value
                        }
                      }
                    }
                    return prev
                  })

                  // 同时更新contentList中对应的项目
                  if (viewingContent && viewingContent.id) {
                    handleContentFormChange(viewingContent.id, field, lang, value)
                  }
                }} // 允许编辑
                onAddLanguage={(lang) => {
                  if (viewingContent) {
                    addLanguageToContent(viewingContent.id, lang)
                    // 也需要更新contentList
                    setContentList(prevList =>
                      prevList.map(listItem => {
                        if (listItem.id === viewingContent.id) {
                          const updatedItem = { ...listItem }
                          const multiLangFields = ['name', 'title', 'description', 'prompt', 'content']
                          multiLangFields.forEach(field => {
                            if (updatedItem[field]) {
                              if (typeof updatedItem[field] === 'string') {
                                updatedItem[field] = { zh: updatedItem[field], [lang]: '' }
                              } else if (typeof updatedItem[field] === 'object') {
                                updatedItem[field] = { ...updatedItem[field], [lang]: '' }
                              }
                            } else {
                              updatedItem[field] = { zh: '', [lang]: '' }
                            }
                          })
                          return updatedItem
                        }
                        return listItem
                      })
                    )
                  }
                }}
                onRemoveLanguage={(lang) => {
                  if (viewingContent) {
                    removeLanguageFromContent(viewingContent.id, lang)
                    if (lang === 'zh') return
                    setContentList(prevList =>
                      prevList.map(listItem => {
                        if (listItem.id === viewingContent.id) {
                          const updatedItem = { ...listItem }
                          const multiLangFields = ['name', 'title', 'description', 'prompt', 'content']
                          multiLangFields.forEach(field => {
                            if (updatedItem[field] && typeof updatedItem[field] === 'object') {
                              const { [lang]: removed, ...rest } = updatedItem[field]
                              updatedItem[field] = rest
                            }
                          })
                          return updatedItem
                        }
                        return listItem
                      })
                    )
                  }
                }}
                onSubmit={() => { }} // 查看模式，不允许提交
                onCancel={closeDetailDialog}
                formatMultiLangField={formatMultiLangField}
                showButtons={false} // 查看模式，不显示提交按钮
                readOnly={false} // 设置为可编辑模式
                onGenerateColoring={handleSingleImageColoring} // 添加上色回调
                isGeneratingColoring={isGeneratingSingleColoring(viewingContent)} // 添加上色状态
                coloringTaskStatus={getColoringTaskStatus(viewingContent)} // 添加上色任务状态
                onTextToImage={handleTextToImage} // 添加文生图回调
                isGeneratingTextToImage={isGeneratingTextToImage(viewingContent)} // 添加文生图状态
                textToImageTaskStatus={getTextToImageTaskStatus(viewingContent)} // 添加文生图任务状态
                onImageToImage={handleImageToImage} // 添加图生图回调
                isGeneratingImageToImage={isGeneratingImageToImage(viewingContent)} // 添加图生图状态
                imageToImageTaskStatus={getImageToImageTaskStatus(viewingContent)} // 添加图生图任务状态
                onGenerateTranslation={(imageId, languageCode, formData) => {
                  // 找到对应的item
                  const item = contentList.find(i => i.id === imageId)
                  if (item) {
                    handleGenerateTranslation(imageId, languageCode, item)
                  }
                }} // 添加翻译回调
                isGeneratingTranslation={isGeneratingTranslation} // 添加翻译状态检查函数
              />
              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button onClick={closeDetailDialog}>
                  关闭
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}

export default App