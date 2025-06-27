import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Check, CheckCircle, Clock, Edit3, Home, Image, ImageIcon, Languages, Palette, PlusCircle, RefreshCw, Save, Settings, Tag, Trash2, X } from 'lucide-react'
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
  // 表单状态
  const [formData, setFormData] = useState({
    keyword: '',
    description: '',
    count: 5,
    template: '',
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

  // 导航状态
  const [currentPage, setCurrentPage] = useState('generator') // 'generator'、'categories'、'tags' 或 'images'

  // 国际化相关状态
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [isGeneratingInternationalization, setIsGeneratingInternationalization] = useState(false)
  const [internationalizationResults, setInternationalizationResults] = useState({})

  // 查看详情相关状态
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [viewingContent, setViewingContent] = useState(null)

  // 单个图片上色状态
  const [singleColoringTasks, setSingleColoringTasks] = useState(new Map()) // 存储单个图片的上色任务

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
          model: formData.model
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
                  setContentList(prev => [...prev, {
                    ...data.content,
                    name: data.content.name || data.content.title, // 初始化name字段
                    imagePath: null,
                    coloringUrl: null, // 初始化上色URL字段
                    imageRatio: globalImageRatio // 使用当前全局比例作为默认值
                  }])

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
          model: formData.model
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
      // 1. 创建图片生成任务
      const response = await fetch('/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contentList.map(item => ({
            id: item.id,
            title: getDisplayText(item.title),
            prompt: getDisplayText(item.prompt),
            imageRatio: item.imageRatio || globalImageRatio // 使用项目特定比例或全局比例
          }))
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
    const itemsWithoutColoring = itemsWithImages.filter(item => !item.coloringUrl)
    if (itemsWithoutColoring.length === 0) {
      alert('所有图片都已经上色完成！')
      return
    }

    if (!confirm(`确认为 ${itemsWithoutColoring.length} 张图片生成上色版本？`)) {
      return
    }

    setIsGeneratingColoring(true)
    setColoringProgress({
      current: 0,
      total: itemsWithoutColoring.length,
      message: '准备开始批量上色...',
      details: {}
    })

    try {
      // 先确保所有图片都保存到数据库
      const itemsNeedSaving = itemsWithoutColoring.filter(item => !item.databaseId)
      const databaseIdMap = new Map() // 存储新分配的databaseId

      if (itemsNeedSaving.length > 0) {
        setColoringProgress(prev => ({
          ...prev,
          message: `先保存 ${itemsNeedSaving.length} 张图片到数据库...`
        }))

        // 自动保存图片到数据库
        for (const item of itemsNeedSaving) {
          try {
            const imageData = {
              name: getDisplayText(item.title),
              title: getDisplayText(item.title),
              description: getDisplayText(item.prompt) || '自动生成的涂色页',
              defaultUrl: item.imagePath,
              type: 'text2image',
              ratio: item.imageRatio || '1:1',
              isPublic: true,
              prompt: getDisplayText(item.prompt),
              userId: 'frontend_user',
              additionalInfo: {
                frontendId: item.id,
                autoGenerated: true
              }
            }

            const response = await fetch('/api/db-images', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(imageData)
            })

            const result = await response.json()

            if (result.success) {
              // 存储到临时映射
              databaseIdMap.set(item.id, result.data.id)
              console.log(`图片已保存到数据库: ${item.id} -> ${result.data.id}`)
            } else {
              throw new Error(result.message || '保存失败')
            }
          } catch (error) {
            console.error(`保存图片失败: ${getDisplayText(item.title)}`, error)
            throw new Error(`保存图片"${getDisplayText(item.title)}"失败: ${error.message}`)
          }
        }

        // 批量更新contentList
        setContentList(prev => prev.map(prevItem => {
          const newDatabaseId = databaseIdMap.get(prevItem.id)
          return newDatabaseId
            ? { ...prevItem, databaseId: newDatabaseId, savedToDatabase: true }
            : prevItem
        }))
      }

      const newTasks = new Map()

      // 为每个需要上色的图片创建上色任务
      for (let i = 0; i < itemsWithoutColoring.length; i++) {
        const item = itemsWithoutColoring[i]

        // 获取databaseId（优先使用新分配的，否则使用原有的）
        const databaseId = databaseIdMap.get(item.id) || item.databaseId

        if (!databaseId) {
          throw new Error(`图片"${getDisplayText(item.title)}"缺少数据库ID`)
        }

        try {
          setColoringProgress(prev => ({
            ...prev,
            current: i,
            message: `正在创建上色任务 ${i + 1}/${itemsWithoutColoring.length}...`
          }))

          // 构造提示词
          const prompt = getDisplayText(item.prompt) || getDisplayText(item.title) || '涂色页'

          // 调用上色API
          const response = await fetch('/api/images/color-generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageId: databaseId, // 使用数据库ID
              prompt: prompt,
              options: {
                ratio: item.imageRatio || '1:1',
                isEnhance: false,
                nVariants: 1
              }
            }),
          })

          const data = await response.json()

          if (data.success && data.data.coloringResult?.taskId) {
            // 记录任务ID与内容的映射
            newTasks.set(data.data.coloringResult.taskId, {
              itemId: item.id,
              imageId: databaseId,
              status: 'processing',
              createdAt: new Date()
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
        if (i < itemsWithoutColoring.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // 更新任务映射
      setColoringTasks(newTasks)

      // 开始轮询所有任务状态
      if (newTasks.size > 0) {
        setColoringProgress(prev => ({
          ...prev,
          current: itemsWithoutColoring.length,
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

        for (const [taskId, taskInfo] of taskEntries) {
          try {
            const response = await fetch(`/api/images/color-task/${taskId}/${taskInfo.imageId}`)
            const data = await response.json()

            if (data.success) {
              const status = data.data.status

              if (status === 'completed' && data.data.coloringUrl) {
                // 任务完成，更新contentList
                setContentList(prev => prev.map(item =>
                  item.id === taskInfo.itemId
                    ? { ...item, coloringUrl: data.data.coloringUrl }
                    : item
                ))

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
                // 更新进度
                const progress = data.data.progress || 0
                setColoringProgress(prev => ({
                  ...prev,
                  details: {
                    ...prev.details,
                    [taskInfo.itemId]: {
                      ...prev.details[taskInfo.itemId],
                      status: 'processing',
                      progress: progress,
                      message: `上色中... ${progress}%`
                    }
                  }
                }))
              }
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
        setTimeout(poll, pollInterval)

      } catch (error) {
        console.error('轮询上色任务状态失败:', error)
        setTimeout(poll, pollInterval)
      }
    }

    // 开始轮询
    setTimeout(poll, 3000) // 3秒后开始第一次轮询
  }

  // 获取保存选项（分类和标签）
  const loadSaveOptions = async () => {
    try {
      const response = await fetch('/api/db-images/save-options')
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
          prompt: formatMultiLangField(item.prompt),
          ratio: item.imageRatio || '1:1',
          type: item.type || 'text2image',
          isPublic: item.isPublic !== undefined ? item.isPublic : false,
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
          const createResponse = await fetch('/api/db-images/save-generated', {
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
            const updateResponse = await fetch(`/api/db-images/${imageData.id}`, {
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
          name: item.title,
          description: item.content
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
        setInternationalizationResults(data.results)
        alert(`成功为 ${itemsWithContent.length} 个内容生成了 ${selectedLanguages.length} 种语言的翻译`)
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

  // 查看内容详情
  const viewContentDetails = (item) => {
    // 转换数据格式以适配 ImageForm
    const formattedContent = {
      name: { zh: item.name || item.title || '' },
      title: { zh: item.title || '' },
      description: { zh: item.content || '' },
      prompt: { zh: item.prompt || '' },
      defaultUrl: item.imagePath ? `/${item.imagePath}` : '',
      colorUrl: '',
      coloringUrl: '',
      type: 'text2image',
      ratio: item.imageRatio || '1:1',
      isPublic: false,
      categoryId: null,
      size: '',
      tagIds: []
    }

    setViewingContent(formattedContent)
    setShowDetailDialog(true)
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

    return {
      name: extractMultiLangField(item.name || item.title),
      title: extractMultiLangField(item.title),
      description: extractMultiLangField(item.description),
      prompt: extractMultiLangField(item.prompt),
      additionalInfo: extractMultiLangField(item.content), // 将content作为additionalInfo（文案内容）
      defaultUrl: item.imagePath ? `/${item.imagePath}` : '',
      colorUrl: '',
      coloringUrl: '',
      type: item.type || 'text2image',
      ratio: item.imageRatio || '1:1',
      isPublic: item.isPublic !== undefined ? item.isPublic : false,
      categoryId: categoryId,
      size: item.size || '',
      tagIds: tagIds
    }
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
                name: typeof item.name === 'object'
                  ? { ...item.name, [lang]: value }
                  : { [lang]: value }
              }
            case 'title':
              return {
                ...item,
                title: typeof item.title === 'object'
                  ? { ...item.title, [lang]: value }
                  : { [lang]: value }
              }
            case 'description':
              return {
                ...item,
                description: typeof item.description === 'object'
                  ? { ...item.description, [lang]: value }
                  : { [lang]: value }
              }
            case 'additionalInfo':
              return {
                ...item,
                content: typeof item.content === 'object'
                  ? { ...item.content, [lang]: value }
                  : { [lang]: value }
              } // additionalInfo对应content字段
            case 'prompt':
              return {
                ...item,
                prompt: typeof item.prompt === 'object'
                  ? { ...item.prompt, [lang]: value }
                  : { [lang]: value }
              }
            case 'ratio':
              return { ...item, imageRatio: value }
            case 'type':
              return { ...item, type: value }
            case 'size':
              return { ...item, size: value }
            case 'isPublic':
              return { ...item, isPublic: value }
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
                newTagSelections.set(itemId, new Set(value))
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

    // 检查是否有数据库ID
    const imageItem = contentList.find(item =>
      item.imagePath === formData.defaultUrl ||
      (item.databaseId && item.databaseId.toString() === formData.id?.toString())
    )

    let imageId = formData.id || imageItem?.databaseId

    try {
      // 如果没有数据库ID，先保存图片到数据库
      if (!imageId) {
        console.log('图片未保存到数据库，正在自动保存...')

        const saveData = {
          name: formData.name?.zh || formData.title?.zh || '单个上色图片',
          title: formData.title?.zh || '单个上色图片',
          description: formData.description?.zh || '手动上色的图片',
          defaultUrl: formData.defaultUrl,
          type: formData.type || 'text2image',
          ratio: formData.ratio || '1:1',
          isPublic: formData.isPublic !== undefined ? formData.isPublic : true,
          prompt: formData.prompt?.zh || '涂色页',
          userId: 'frontend_user',
          additionalInfo: {
            frontendId: imageItem?.id,
            singleColoring: true
          }
        }

        const saveResponse = await fetch('/api/db-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(saveData)
        })

        const saveResult = await saveResponse.json()

        if (!saveResult.success) {
          throw new Error(saveResult.message || '保存图片到数据库失败')
        }

        imageId = saveResult.data.id

        // 更新contentList中的databaseId
        if (imageItem) {
          setContentList(prev => prev.map(item =>
            item.id === imageItem.id
              ? { ...item, databaseId: imageId, savedToDatabase: true }
              : item
          ))
        }

        console.log(`图片已保存到数据库: ${imageId}`)
      }

      // 构造提示词
      const prompt = formData.prompt?.zh || formData.title?.zh || '涂色页'

      // 调用上色API
      const response = await fetch('/api/images/color-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: imageId,
          prompt: prompt,
          options: {
            ratio: formData.ratio || '1:1',
            isEnhance: false,
            nVariants: 1
          }
        }),
      })

      const data = await response.json()

      if (data.success && data.data.coloringResult?.taskId) {
        const taskId = data.data.coloringResult.taskId

        // 记录单个上色任务
        setSingleColoringTasks(prev => {
          const newMap = new Map(prev)
          newMap.set(taskId, {
            imageId: imageId,
            formDataId: formData.id,
            frontendItemId: imageItem?.id,
            status: 'processing',
            createdAt: new Date()
          })
          return newMap
        })

        console.log(`单个图片上色任务已创建: ${taskId}`)

        // 开始轮询单个上色任务状态
        pollSingleColoringTask(taskId, imageId)

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
  const pollSingleColoringTask = async (taskId, imageId) => {
    const pollInterval = 3000 // 每3秒查询一次
    let pollCount = 0
    const maxPolls = 180 // 最多查询9分钟

    const poll = async () => {
      try {
        const response = await fetch(`/api/images/color-task/${taskId}/${imageId}`)
        const data = await response.json()

        if (data.success) {
          const status = data.data.status

          if (status === 'completed' && data.data.coloringUrl) {
            // 任务完成，更新相关状态
            const taskInfo = singleColoringTasks.get(taskId)

            if (taskInfo) {
              // 如果有对应的前端item，更新contentList
              if (taskInfo.frontendItemId) {
                setContentList(prev => prev.map(item =>
                  item.id === taskInfo.frontendItemId
                    ? { ...item, coloringUrl: data.data.coloringUrl }
                    : item
                ))
              }

              // 更新查看详情弹框的数据
              if (viewingContent && viewingContent.id === taskInfo.formDataId) {
                setViewingContent(prev => ({
                  ...prev,
                  coloringUrl: data.data.coloringUrl
                }))
              }

              // 清除任务记录
              setSingleColoringTasks(prev => {
                const newMap = new Map(prev)
                newMap.delete(taskId)
                return newMap
              })

              console.log(`单个图片上色完成: ${taskId}`)
            }

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
            console.log(`单个图片上色进行中: ${taskId}, 状态: ${status}`)
          }
        }

        // 继续轮询
        pollCount++
        if (pollCount < maxPolls) {
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

    // 开始轮询
    poll()
  }

  // 检查是否有正在进行的单个上色任务
  const isGeneratingSingleColoring = (formData) => {
    return Array.from(singleColoringTasks.values()).some(task =>
      task.formDataId === formData.id ||
      task.frontendItemId === contentList.find(item =>
        item.imagePath === formData.defaultUrl
      )?.id
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 导航栏 */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-2xl font-bold">涂色书内容自动生成器</h1>
            <div className="flex items-center gap-2">
              {/* 国际化控制区域 */}
              {currentPage === 'generator' && contentList.some(item => item.content) && (
                <div className="flex items-center gap-2 mr-4 p-2 bg-gray-50 rounded-lg border">
                  <div className="min-w-48">
                    <MultiSelect
                      options={languageOptions}
                      value={selectedLanguages}
                      onChange={setSelectedLanguages}
                      placeholder="选择目标语言"
                    />
                  </div>
                  <Button
                    onClick={generateInternationalization}
                    disabled={isGeneratingInternationalization || selectedLanguages.length === 0}
                    size="sm"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Languages className="w-4 h-4" />
                    {isGeneratingInternationalization ? '生成中...' : '生成国际化'}
                  </Button>
                </div>
              )}

              {/* 页面导航按钮 */}
              <div className="flex gap-2">
                <Button
                  variant={currentPage === 'generator' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('generator')}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  内容生成
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
                <Button
                  variant={currentPage === 'images' ? 'default' : 'outline'}
                  onClick={() => setCurrentPage('images')}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  图片管理
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
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
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
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
                              <SelectItem value="1:1">正方形 (1:1)</SelectItem>
                              <SelectItem value="3:2">横向 (3:2)</SelectItem>
                              <SelectItem value="2:3">纵向 (2:3)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="model" className="text-sm font-medium">AI模型</Label>
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
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="template" className="text-sm font-medium">文案模板（可选）</Label>
                    <Textarea
                      id="template"
                      placeholder="输入自定义文案模板，留空将使用默认模板"
                      value={formData.template}
                      onChange={(e) => handleInputChange('template', e.target.value)}
                      rows={4}
                      className="resize-none"
                    />
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                        {/* 检查是否有已生成的文案 */}
                        {contentList.some(item => item.content) ? (
                          <div className="space-y-2">
                            <Button
                              onClick={() => generateContent(false)}
                              disabled={isGeneratingContent || contentList.filter(item => !item.content).length === 0}
                              variant="outline"
                              className="w-full border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2"
                              size="sm"
                            >
                              <Edit3 className="w-4 h-4" />
                              {isGeneratingContent ? '生成中...' : `生成剩余文案 (${contentList.filter(item => !item.content).length})`}
                            </Button>
                            <Button
                              onClick={() => generateContent(true)}
                              disabled={isGeneratingContent}
                              variant="outline"
                              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                              size="sm"
                            >
                              <RefreshCw className="w-4 h-4" />
                              {isGeneratingContent ? '生成中...' : '重新生成所有文案'}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => generateContent(false)}
                            disabled={isGeneratingContent || contentList.length === 0}
                            variant="outline"
                            className="w-full border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2"
                            size="sm"
                          >
                            <Edit3 className="w-4 h-4" />
                            {isGeneratingContent ? '生成中...' : '生成文案'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 第三步：生成图片 */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center">
                          <Image className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-medium text-purple-900 mb-2">生成图片</h3>
                        <p className="text-sm text-purple-700 mb-4">AI生成专业涂色页图片</p>
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

                    {/* 第四步：图片上色 */}
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-full flex items-center justify-center">
                          <Palette className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="font-medium text-orange-900 mb-2">图片上色</h3>
                        <p className="text-sm text-orange-700 mb-4">为线稿图生成马克笔上色版本</p>
                        <Button
                          onClick={handleBatchColoring}
                          disabled={!contentList.some(item => item.imagePath && !item.coloringUrl) || isGeneratingColoring}
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
                              editingLanguages={['zh']} // 只显示中文
                              supportedLanguages={supportedLanguages}
                              categories={saveOptions.categories}
                              tags={saveOptions.tags}
                              typeOptions={[
                                { value: 'text2image', label: '文字生成图片' },
                                { value: 'image2image', label: '图片转图片' },
                                { value: 'image2coloring', label: '图片转涂色' }
                              ]}
                              ratioOptions={[
                                { value: '1:1', label: '正方形 (1:1)' },
                                { value: '3:2', label: '横向 (3:2)' },
                                { value: '2:3', label: '纵向 (2:3)' },
                                { value: '4:3', label: '横向 (4:3)' },
                                { value: '3:4', label: '纵向 (3:4)' },
                                { value: '16:9', label: '宽屏 (16:9)' }
                              ]}
                              loading={false}
                              onInputChange={(field, lang, value) => handleContentFormChange(item.id, field, lang, value)}
                              onAddLanguage={() => { }} // 暂时不支持添加语言
                              onRemoveLanguage={() => { }} // 暂时不支持移除语言
                              onSubmit={() => { }} // 不显示提交按钮
                              onCancel={() => { }} // 不显示取消按钮
                              formatMultiLangField={formatMultiLangField}
                              showButtons={false} // 不显示操作按钮
                              readOnly={false} // 设置为可编辑模式
                              className="scale-90 origin-top" // 缩小以适应卡片
                              onGenerateColoring={handleSingleImageColoring} // 添加上色回调
                              isGeneratingColoring={isGeneratingSingleColoring(convertItemToFormData(item))} // 添加上色状态
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 国际化结果展示 */}
              {Object.keys(internationalizationResults).length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="w-5 h-5" />
                      国际化翻译结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(internationalizationResults).map(([itemId, translations]) => {
                        const item = contentList.find(c => c.id === itemId)
                        if (!item) return null

                        return (
                          <div key={itemId} className="border border-gray-200 rounded-lg p-4">
                            <div className="mb-3">
                              <h3 className="font-medium text-gray-900">
                                {getDisplayText(item.title)}
                              </h3>
                              <p className="text-sm text-gray-500">原始内容</p>
                            </div>

                            <div className="grid gap-4">
                              {Object.entries(translations).map(([langCode, translation]) => {
                                const language = supportedLanguages.find(lang => lang.code === langCode)

                                return (
                                  <div key={langCode} className="bg-gray-50 p-3 rounded border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Languages className="w-4 h-4 text-blue-600" />
                                      <span className="font-medium text-blue-900">
                                        {language ? language.name : langCode}
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      <div>
                                        <Label className="text-xs text-gray-600">标题</Label>
                                        <p className="text-sm text-gray-900 bg-white p-2 rounded border">
                                          {getDisplayText(translation.name) || '未翻译'}
                                        </p>
                                      </div>

                                      <div>
                                        <Label className="text-xs text-gray-600">内容</Label>
                                        <div className="text-sm text-gray-900 bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                                          {getDisplayText(translation.description) || '未翻译'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={() => {
                          alert('国际化结果已生成，您可以复制使用这些翻译内容')
                        }}
                        className="flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        使用翻译结果
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setInternationalizationResults({})
                          setSelectedLanguages([])
                        }}
                      >
                        清除结果
                      </Button>
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
                editingLanguages={getExistingLanguages(viewingContent)}
                supportedLanguages={supportedLanguages}
                categories={[]} // 生成内容查看时不需要分类列表
                tags={[]} // 生成内容查看时不需要标签列表
                typeOptions={[
                  { value: 'text2image', label: '文字生成图片' },
                  { value: 'image2image', label: '图片转图片' },
                  { value: 'image2coloring', label: '图片转涂色' }
                ]}
                ratioOptions={[
                  { value: '1:1', label: '正方形 (1:1)' },
                  { value: '3:2', label: '横向 (3:2)' },
                  { value: '2:3', label: '纵向 (2:3)' },
                  { value: '4:3', label: '横向 (4:3)' },
                  { value: '3:4', label: '纵向 (3:4)' },
                  { value: '16:9', label: '宽屏 (16:9)' }
                ]}
                loading={false}
                onInputChange={() => { }} // 查看模式，不允许编辑
                onAddLanguage={() => { }} // 查看模式，不允许编辑
                onRemoveLanguage={() => { }} // 查看模式，不允许编辑
                onSubmit={() => { }} // 查看模式，不允许提交
                onCancel={closeDetailDialog}
                formatMultiLangField={formatMultiLangField}
                showButtons={false} // 查看模式，不显示提交按钮
                readOnly={true} // 设置为只读模式
                onGenerateColoring={handleSingleImageColoring} // 添加上色回调
                isGeneratingColoring={isGeneratingSingleColoring(viewingContent)} // 添加上色状态
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