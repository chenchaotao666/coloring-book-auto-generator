import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle,
  Check,
  CheckSquare,
  Edit3,
  Eye,
  Image as ImageIcon,
  Languages,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import ImageForm from './ImageForm'
import InternationalizationEditor from './InternationalizationEditor'

const ImagesManager = () => {
  // 状态管理
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [internationalizationLoading, setInternationalizationLoading] = useState(false)
  const [internationalizationResults, setInternationalizationResults] = useState({})
  const [activeInternationalizationLanguage, setActiveInternationalizationLanguage] = useState('') // 国际化结果的活跃语言tab

  // 单个图片上色状态
  const [singleColoringTasks, setSingleColoringTasks] = useState(new Map()) // 存储单个图片的上色任务

  // 分类和标签数据
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])

  // 表单状态
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    name: { zh: '' },
    title: { zh: '' },
    description: { zh: '' },
    prompt: { zh: '' },
    defaultUrl: '',
    colorUrl: '',
    coloringUrl: '',
    type: 'text2image',
    ratio: '1:1',
    isPublic: false,
    categoryId: null,
    size: '',
    tagIds: []
  })

  // 多语言编辑状态
  const [editingLanguages, setEditingLanguages] = useState(['zh']) // 默认编辑中文

  // 筛选状态
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    categoryId: '',
    isPublic: '',
    page: 1,
    limit: 20
  })

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  // 支持的语言
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

  // 图片类型选项
  const typeOptions = [
    { value: 'text2image', label: '文字生成图片' },
    { value: 'image2image', label: '图片转图片' },
    { value: 'image2coloring', label: '图片转涂色' }
  ]

  // 比例选项
  const ratioOptions = [
    { value: '21:9', label: '超宽屏 (21:9)' },
    { value: '16:9', label: '宽屏 (16:9)' },
    { value: '4:3', label: '横向 (4:3)' },
    { value: '1:1', label: '正方形 (1:1)' },
    { value: '3:4', label: '纵向 (3:4)' },
    { value: '9:16', label: '竖屏 (9:16)' },
    { value: '16:21', label: '超高屏 (16:21)' }
  ]

  // 获取所有已有的语言版本
  const getExistingLanguages = (formData) => {
    const allLanguages = new Set(['zh']) // 中文是必须的

      // 检查各个多语言字段中存在的语言
      ;['name', 'title', 'description', 'prompt', 'additionalInfo'].forEach(field => {
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

  // 添加语言版本
  const addLanguage = (langCode) => {
    if (!editingLanguages.includes(langCode)) {
      setEditingLanguages([...editingLanguages, langCode])

      // 初始化该语言的字段
      setFormData(prev => ({
        ...prev,
        name: { ...prev.name, [langCode]: '' },
        title: { ...prev.title, [langCode]: '' },
        description: { ...prev.description, [langCode]: '' },
        prompt: { ...prev.prompt, [langCode]: '' },
        additionalInfo: { ...prev.additionalInfo, [langCode]: '' }
      }))
    }
  }

  // 移除语言版本
  const removeLanguage = (langCode) => {
    if (langCode !== 'zh' && editingLanguages.includes(langCode)) {
      setEditingLanguages(editingLanguages.filter(lang => lang !== langCode))

      // 移除该语言的字段
      setFormData(prev => {
        const newData = { ...prev }
          ;['name', 'title', 'description', 'prompt', 'additionalInfo'].forEach(field => {
            if (newData[field] && newData[field][langCode] !== undefined) {
              const newField = { ...newData[field] }
              delete newField[langCode]
              newData[field] = newField
            }
          })
        return newData
      })
    }
  }

  // 加载图片列表
  const loadImages = async () => {
    setLoading(true)
    setError('')

    try {
      const queryParams = new URLSearchParams()
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.type) queryParams.append('type', filters.type)
      if (filters.categoryId) queryParams.append('category_id', filters.categoryId)
      if (filters.isPublic !== '') queryParams.append('isPublic', filters.isPublic)
      queryParams.append('page', filters.page.toString())
      queryParams.append('limit', filters.limit.toString())

      const response = await fetch(`/api/images?${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setImages(data.data)
        if (data.pagination) {
          setPagination(data.pagination)
        }
      } else {
        setError(data.message || '加载图片失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 加载分类和标签
  const loadCategoriesAndTags = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/tags')
      ])

      const [categoriesData, tagsData] = await Promise.all([
        categoriesRes.json(),
        tagsRes.json()
      ])

      console.log('加载的分类数据:', categoriesData)
      console.log('加载的标签数据:', tagsData)

      if (categoriesData.success) {
        setCategories(categoriesData.data)
      }
      if (tagsData.success) {
        setTags(tagsData.data)
        console.log('设置的标签数据:', tagsData.data)
      }
    } catch (err) {
      console.error('加载分类和标签失败:', err)
    }
  }

  // 初始加载
  useEffect(() => {
    loadImages()
    loadCategoriesAndTags()
  }, [])

  // 当国际化结果变化时，设置默认的活跃语言
  useEffect(() => {
    if (Object.keys(internationalizationResults).length > 0 && !activeInternationalizationLanguage) {
      // 获取第一个项目的第一个语言作为默认活跃语言
      const firstItemId = Object.keys(internationalizationResults)[0]
      const firstItemTranslations = internationalizationResults[firstItemId]
      if (firstItemTranslations) {
        const firstLanguage = Object.keys(firstItemTranslations)[0]
        if (firstLanguage) {
          setActiveInternationalizationLanguage(firstLanguage)
        }
      }
    }
  }, [internationalizationResults, activeInternationalizationLanguage])

  // 筛选变化时重新加载
  useEffect(() => {
    loadImages()
  }, [filters])

  // 清除提示信息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // 重置表单
  const resetForm = () => {
    setFormData({
      id: null,
      name: { zh: '' },
      title: { zh: '' },
      description: { zh: '' },
      prompt: { zh: '' },
      additionalInfo: { zh: '' },
      defaultUrl: '',
      colorUrl: '',
      coloringUrl: '',
      type: 'text2image',
      ratio: '1:1',
      isPublic: false,
      hotness: 0,
      categoryId: null,
      size: '',
      tagIds: []
    })
    setEditingLanguages(['zh']) // 重置为只编辑中文
    setEditingId(null)
    setShowForm(false)
  }

  // 处理表单输入
  const handleInputChange = (field, lang, value) => {
    if (lang) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [lang]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // 处理筛选变化
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // 重置到第一页
    }))
  }

  // 格式化多语言字段显示
  const formatMultiLangField = (field) => {
    if (!field) return '未设置'

    let parsed = {}
    if (typeof field === 'string') {
      try {
        parsed = JSON.parse(field)
      } catch {
        parsed = { zh: field }
      }
    } else if (typeof field === 'object') {
      parsed = field || {}
    }

    return parsed.zh || parsed.en || Object.values(parsed)[0] || '未设置'
  }

  // 获取分类名称
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.category_id === categoryId)
    return category ? formatMultiLangField(category.display_name) : '未分类'
  }

  // 开始编辑
  const startEdit = (image) => {
    // 解析多语言字段
    const parseField = (field) => {
      if (!field) return { zh: '' }
      if (typeof field === 'string') {
        try {
          return JSON.parse(field)
        } catch {
          return { zh: field }
        }
      }
      return field || { zh: '' }
    }

    const parsedFormData = {
      id: image.id,
      name: parseField(image.name),
      title: parseField(image.title),
      description: parseField(image.description),
      prompt: parseField(image.prompt),
      additionalInfo: parseField(image.additionalInfo),
      defaultUrl: image.defaultUrl || '',
      colorUrl: image.colorUrl || '',
      coloringUrl: image.coloringUrl || '',
      type: image.type || 'text2image',
      ratio: image.ratio || '1:1',
      isPublic: image.isPublic || false,
      hotness: image.hotness || 0,
      categoryId: image.categoryId || null,
      size: image.size || '',
      tagIds: image.tags ? image.tags.map(tag => tag.tag_id) : []
    }

    // 如果有国际化翻译结果，合并到formData中
    const imageTranslations = internationalizationResults[image.id]
    if (imageTranslations) {
      Object.entries(imageTranslations).forEach(([langCode, translation]) => {
        // 只合并有内容的翻译
        if (translation && typeof translation === 'object') {
          Object.entries(translation).forEach(([fieldName, value]) => {
            if (value && parsedFormData[fieldName]) {
              parsedFormData[fieldName] = {
                ...parsedFormData[fieldName],
                [langCode]: value
              }
            }
          })
        }
      })
    }

    setFormData(parsedFormData)

    // 设置编辑的语言版本 - 包含已有翻译的语言
    const existingLangs = getExistingLanguages(parsedFormData)
    const translationLangs = imageTranslations ? Object.keys(imageTranslations) : []
    const allLanguages = Array.from(new Set([...existingLangs, ...translationLangs]))
    setEditingLanguages(allLanguages.length > 0 ? allLanguages : ['zh'])

    setEditingId(image.id)
    setShowForm(true)
  }

  // 开始新增
  const startAdd = () => {
    resetForm()
    setShowForm(true)
  }

  // 提交表单
  const handleSubmit = async (e, silent = false) => {
    if (e) e.preventDefault()
    setLoading(true)
    if (!silent) setError('')

    try {
      const url = editingId ? `/api/images/${editingId}` : '/api/images'
      const method = editingId ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        category_id: formData.categoryId || null
      }

      console.log('提交的表单数据:', submitData)
      console.log('分类ID值:', formData.categoryId, '类型:', typeof formData.categoryId)

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (data.success) {
        if (!silent) {
          setSuccess(editingId ? '图片更新成功' : '图片创建成功')
        }

        // 如果是新建图片，设置editingId
        if (!editingId && data.data && data.data.id) {
          setEditingId(data.data.id)
        }

        if (!silent) {
          resetForm()
        }
        loadImages()

        return data.data // 返回创建/更新的数据
      } else {
        if (!silent) {
          setError(data.message || '操作失败')
        }
        return false
      }
    } catch (err) {
      if (!silent) {
        setError('网络错误：' + err.message)
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  // 手动上色功能
  const handleManualColoring = async (imageId, imageData) => {
    if (!confirm('确认为此图片生成上色版本？')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const prompt = imageData.prompt ?
        (typeof imageData.prompt === 'object' ? imageData.prompt.zh || imageData.prompt.en || '' : imageData.prompt) :
        ''

      const response = await fetch('/api/images/color-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: imageId,
          prompt: prompt,
          options: {
            isEnhance: false,
            nVariants: 1
          }
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('上色任务已创建，正在处理中，请稍后刷新查看结果...')

        // 3秒后自动刷新图片列表
        setTimeout(() => {
          loadImages()
        }, 3000)
      } else {
        setError(data.message || '上色失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 单个图片上色功能（用于ImageForm）
  const handleSingleImageColoring = async (formData) => {
    if (!formData.defaultUrl) {
      alert('请先确保有默认图片URL')
      return
    }

    console.log('🎨 开始单个图片上色:')
    console.log('- formData.id:', formData.id)
    console.log('- formData.defaultUrl:', formData.defaultUrl)

    try {
      // 构造提示词
      const prompt = formData.prompt?.zh || formData.title?.zh || '涂色页'

      // 调用上色API，直接使用图片URL而不是数据库ID
      const response = await fetch('/api/images/color-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: formData.defaultUrl, // 直接使用图片URL
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
          const taskData = {
            imageUrl: formData.defaultUrl, // 使用图片URL而不是数据库ID
            formDataId: formData.id,
            imageId: formData.id || editingId, // 保留imageId用于兼容
            defaultUrl: formData.defaultUrl,
            status: 'processing',
            createdAt: new Date()
          }
          newMap.set(taskId, taskData)
          console.log('📝 创建上色任务记录:', {
            taskId,
            taskData
          })
          return newMap
        })

        console.log(`单个图片上色任务已创建: ${taskId}`)

        // 开始轮询单个上色任务状态
        pollSingleColoringTask(taskId, formData.id || editingId)

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
    const maxPolls = 60 // 最多查询3分钟

    console.log(`🚀 开始轮询单个上色任务: ${taskId} for imageId: ${imageId}`)

    const poll = async () => {
      try {
        console.log(`🔄 轮询上色任务 ${taskId} - 第 ${pollCount + 1} 次`)

        // 使用新的任务状态查询API
        const response = await fetch(`/api/images/task-status/${taskId}?taskType=image-coloring`)
        const data = await response.json()

        console.log(`📊 上色任务 ${taskId} 状态响应:`, data)

        if (data.success) {
          const status = data.data.status

          // 更新任务进度
          const progress = Math.min(10 + pollCount * 3, 90) // 从10%开始，每次增加3%，最高90%
          setSingleColoringTasks(prev => {
            const newMap = new Map(prev)
            const currentTask = newMap.get(taskId)
            if (currentTask) {
              newMap.set(taskId, {
                ...currentTask,
                progress: status === 'completed' ? 100 : progress,
                status: status,
                message: status === 'completed' ? '上色完成！' : `正在上色中... (${pollCount + 1}/${maxPolls})`
              })
            }
            return newMap
          })

          if (status === 'completed' && (data.data.coloringUrl || data.data.imageUrl)) {
            console.log(`🎨 上色任务完成: ${taskId}`)

            // 获取上色后的图片URL
            const coloringUrl = data.data.coloringUrl || data.data.imageUrl

            // 更新当前编辑表单的数据
            if (editingId && editingId.toString() === imageId.toString()) {
              setFormData(prev => ({
                ...prev,
                coloringUrl: coloringUrl
              }))
              console.log(`✅ 已更新编辑表单的coloringUrl: ${coloringUrl}`)
            }

            // 重新加载图片列表以获取最新数据，确保覆盖之前的上色结果
            loadImages()

            // 清除任务记录
            setSingleColoringTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskId)
              return newMap
            })

            setSuccess('图片上色完成！上色结果已更新。')
            console.log(`✅ 单个图片上色完成: ${taskId}`)
            return

          } else if (status === 'failed') {
            // 任务失败
            console.error(`❌ 单个图片上色失败: ${taskId}`)

            // 清除任务记录
            setSingleColoringTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskId)
              return newMap
            })

            setError('图片上色失败，请重试')
            return

          } else {
            // 任务仍在进行中，继续轮询
            console.log(`🔄 任务仍在进行中: ${taskId}, 状态: ${status}`)
          }
        } else {
          console.error(`❌ 上色任务状态查询失败: ${taskId}`, data)
        }

        // 继续轮询
        pollCount++
        if (pollCount < maxPolls) {
          setTimeout(poll, pollInterval)
        } else {
          console.warn(`⏰ 单个图片上色任务轮询超时: ${taskId}`)

          // 清除任务记录
          setSingleColoringTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(taskId)
            return newMap
          })

          setError('上色任务查询超时，请稍后检查结果')
        }

      } catch (error) {
        console.error(`❌ 查询单个上色任务状态失败: ${taskId}`, error)

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

          setError('上色任务查询失败，请重试')
        }
      }
    }

    // 开始轮询
    poll()
  }

  // 检查是否有正在进行的单个上色任务
  const isGeneratingSingleColoring = (formData) => {
    const imageId = formData.id || editingId
    return Array.from(singleColoringTasks.values()).some(task => {
      // 只检查processing状态的任务，不包括completed状态
      if (task.status === 'completed') {
        return false
      }

      // 多种匹配方式
      const matches = (
        task.imageId?.toString() === imageId?.toString() ||
        task.formDataId === formData.id ||
        (task.defaultUrl && (task.defaultUrl === formData.defaultUrl || task.defaultUrl === formData.imagePath)) ||
        (task.imageUrl && (task.imageUrl === formData.defaultUrl || task.imageUrl === formData.imagePath))
      )

      if (matches) {
        console.log(`🔍 找到匹配的上色任务:`, task)
      }

      return matches
    })
  }

  // 获取上色任务状态
  const getColoringTaskStatus = (formData) => {
    const imageId = formData.id || editingId
    for (const [taskId, task] of singleColoringTasks) {
      const matches = (
        task.imageId?.toString() === imageId?.toString() ||
        task.formDataId === formData.id ||
        (task.defaultUrl && (task.defaultUrl === formData.defaultUrl || task.defaultUrl === formData.imagePath)) ||
        (task.imageUrl && (task.imageUrl === formData.defaultUrl || task.imageUrl === formData.imagePath))
      )

      if (matches) {
        return {
          taskId: taskId,
          progress: task.progress || 0,
          status: task.status || 'processing',
          message: task.message || '正在上色中...'
        }
      }
    }
    return null
  }

  // 删除图片
  const handleDelete = async (imageId, title) => {
    if (!confirm(`确认删除图片 "${formatMultiLangField(title)}"？此操作不可恢复。`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('图片删除成功')
        loadImages()
      } else {
        setError(data.message || '删除失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === images.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(images.map(img => img.id)))
    }
  }

  // 切换单项选择
  const toggleSelectItem = (imageId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId)
    } else {
      newSelected.add(imageId)
    }
    setSelectedItems(newSelected)
  }

  // 国际化处理
  const handleInternationalization = async () => {
    if (selectedItems.size === 0 || selectedLanguages.length === 0) {
      setError('请选择图片和目标语言')
      return
    }

    setInternationalizationLoading(true)
    setError('')

    try {
      const selectedImagesData = images.filter(img => selectedItems.has(img.id))
      const contentToTranslate = selectedImagesData.map(img => ({
        id: img.id,
        name: formatMultiLangField(img.name),
        title: formatMultiLangField(img.title),
        description: formatMultiLangField(img.description),
        prompt: formatMultiLangField(img.prompt),
        additionalInfo: formatMultiLangField(img.additionalInfo) // 添加文案内容字段
      }))

      const response = await fetch('/api/internationalization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'content',
          targetLanguages: selectedLanguages,
          items: contentToTranslate
        }),
      })

      const data = await response.json()

      if (data.success) {
        setInternationalizationResults(data.results)

        // 如果当前正在编辑某个图片，且该图片在翻译结果中，更新formData
        if (editingId && data.results[editingId]) {
          const imageTranslations = data.results[editingId]
          setFormData(prev => {
            const updatedData = { ...prev }

            // 为每种翻译语言更新各个字段
            Object.entries(imageTranslations).forEach(([langCode, translation]) => {
              if (translation && typeof translation === 'object') {
                Object.entries(translation).forEach(([fieldName, value]) => {
                  if (value && updatedData[fieldName]) {
                    updatedData[fieldName] = {
                      ...updatedData[fieldName],
                      [langCode]: value
                    }
                  }
                })
              }
            })

            return updatedData
          })

          // 确保新翻译的语言被添加到editingLanguages中
          const newLanguages = Object.keys(imageTranslations)
          setEditingLanguages(prev => {
            const combined = Array.from(new Set([...prev, ...newLanguages]))
            return combined
          })
        }

        // 自动设置第一个语言为活跃语言
        if (selectedLanguages.length > 0) {
          setActiveInternationalizationLanguage(selectedLanguages[0])
        }

        setSuccess(`成功生成 ${selectedLanguages.length} 种语言的翻译`)
      } else {
        setError(data.message || '国际化生成失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setInternationalizationLoading(false)
    }
  }

  // 保存翻译结果
  const handleSaveTranslations = async () => {
    setLoading(true)
    setError('')

    try {
      const updates = []

      // 构建批量更新数据
      Object.entries(internationalizationResults).forEach(([imageId, translations]) => {
        const currentImage = images.find(img => img.id === imageId)
        if (!currentImage) return

        // 合并现有的多语言数据
        const mergeMultiLangField = (currentField, newTranslations, fieldName) => {
          let current = {}
          if (typeof currentField === 'string') {
            try {
              current = JSON.parse(currentField)
            } catch {
              current = { zh: currentField }
            }
          } else if (typeof currentField === 'object') {
            current = currentField || {}
          }

          // 添加新翻译
          Object.entries(newTranslations).forEach(([langCode, content]) => {
            if (content[fieldName]) {
              current[langCode] = content[fieldName]
            }
          })

          return current
        }

        const updatedData = {
          // 保留所有原有字段
          defaultUrl: currentImage.defaultUrl,
          colorUrl: currentImage.colorUrl,
          coloringUrl: currentImage.coloringUrl,
          type: currentImage.type,
          ratio: currentImage.ratio,
          isPublic: currentImage.isPublic,
          userId: currentImage.userId,
          category_id: currentImage.categoryId,
          size: currentImage.size,
          tagIds: currentImage.tags ? currentImage.tags.map(tag => tag.tag_id) : [],
          // 更新多语言字段
          name: mergeMultiLangField(currentImage.name, translations, 'name'),
          title: mergeMultiLangField(currentImage.title, translations, 'title'),
          description: mergeMultiLangField(currentImage.description, translations, 'description'),
          prompt: mergeMultiLangField(currentImage.prompt, translations, 'prompt'),
          additionalInfo: mergeMultiLangField(currentImage.additionalInfo, translations, 'additionalInfo') // 添加文案内容字段的更新
        }

        updates.push({
          id: imageId,
          ...updatedData
        })
      })

      // 批量更新
      const promises = updates.map(update =>
        fetch(`/api/images/${update.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        })
      )

      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map(res => res.json()))

      const successful = results.filter(result => result.success).length
      const total = results.length
      const failed = results.filter(result => !result.success)

      if (successful === total) {
        setSuccess(`成功保存 ${successful} 个图片的翻译`)
        setInternationalizationResults({})
        setSelectedItems(new Set())
        setActiveInternationalizationLanguage('') // 清除活跃语言
        loadImages()
      } else {
        // 显示详细的错误信息
        const errorMessages = failed.map(f => f.message || '未知错误').join('; ')
        setError(`部分保存失败：${successful}/${total} 成功。错误：${errorMessages}`)
        console.error('保存翻译失败的详细信息:', failed)
      }
    } catch (err) {
      setError('保存翻译失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 翻译结果编辑
  const handleTranslationEdit = (imageId, langCode, field, value) => {
    setInternationalizationResults(prev => ({
      ...prev,
      [imageId]: {
        ...prev[imageId],
        [langCode]: {
          ...prev[imageId][langCode],
          [field]: value
        }
      }
    }))
  }

  // 单独生成翻译状态
  const [singleTranslationTasks, setSingleTranslationTasks] = useState(new Map()) // 存储单个翻译任务

  // 单独生成翻译
  const handleGenerateTranslation = async (imageId, languageCode, originalImage) => {
    // 添加强验证
    if (!imageId || imageId === undefined || imageId === null) {
      console.error('❌ imageId无效:', imageId)
      setError('图片ID无效，无法生成翻译')
      return
    }

    if (!languageCode) {
      console.error('❌ languageCode无效:', languageCode)
      setError('语言代码无效，无法生成翻译')
      return
    }

    if (!originalImage) {
      console.error('❌ originalImage无效:', originalImage)
      setError('原始图片数据无效，无法生成翻译')
      return
    }

    const taskKey = `${imageId}-${languageCode}`

    // 设置生成状态
    setSingleTranslationTasks(prev => {
      const newMap = new Map(prev)
      newMap.set(taskKey, { status: 'loading' })
      return newMap
    })

    try {
      // 获取中文内容作为源内容
      const sourceContent = {
        name: formatMultiLangField(originalImage.name),
        title: formatMultiLangField(originalImage.title),
        description: formatMultiLangField(originalImage.description),
        prompt: formatMultiLangField(originalImage.prompt),
        additionalInfo: formatMultiLangField(originalImage.additionalInfo)
      }

      const requestData = {
        type: 'content',
        items: [{
          id: imageId,
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

      if (data.success && data.results[imageId] && data.results[imageId][languageCode]) {
        // 更新翻译结果
        const newTranslation = data.results[imageId][languageCode]
        setInternationalizationResults(prev => ({
          ...prev,
          [imageId]: {
            ...prev[imageId],
            [languageCode]: newTranslation
          }
        }))

        // 如果当前正在编辑这个图片，也要更新formData
        if (editingId && editingId.toString() === imageId.toString()) {
          setFormData(prev => ({
            ...prev,
            name: {
              ...prev.name,
              [languageCode]: newTranslation.name || ''
            },
            title: {
              ...prev.title,
              [languageCode]: newTranslation.title || ''
            },
            description: {
              ...prev.description,
              [languageCode]: newTranslation.description || ''
            },
            prompt: {
              ...prev.prompt,
              [languageCode]: newTranslation.prompt || ''
            },
            additionalInfo: {
              ...prev.additionalInfo,
              [languageCode]: newTranslation.additionalInfo || ''
            }
          }))

          // 确保新语言被添加到editingLanguages中
          if (!editingLanguages.includes(languageCode)) {
            setEditingLanguages(prev => [...prev, languageCode])
          }
        }

        // 设置活跃语言为当前生成的语言
        setActiveInternationalizationLanguage(languageCode)

        // 清除生成状态
        setSingleTranslationTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(taskKey)
          return newMap
        })

        setSuccess(`成功生成${supportedLanguages.find(lang => lang.code === languageCode)?.name || languageCode}翻译`)
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error(data.message || '翻译生成失败')
      }
    } catch (error) {
      console.error('单独生成翻译失败:', error)
      setError('翻译生成失败: ' + error.message)
      setTimeout(() => setError(''), 5000)

      // 清除生成状态
      setSingleTranslationTasks(prev => {
        const newMap = new Map(prev)
        newMap.delete(taskKey)
        return newMap
      })
    }
  }

  // 检查是否正在生成特定翻译
  const isGeneratingTranslation = (imageId, languageCode) => {
    const taskKey = `${imageId}-${languageCode}`
    return singleTranslationTasks.has(taskKey)
  }

  // 为ImageForm创建的检查函数
  const isGeneratingTranslationForForm = (formData, languageCode) => {
    if (!formData.id || !languageCode || languageCode === 'zh') return false
    return isGeneratingTranslation(formData.id, languageCode)
  }

  // 文生图和图生图任务状态
  const [textToImageTasks, setTextToImageTasks] = useState(new Map())
  const [imageToImageTasks, setImageToImageTasks] = useState(new Map())

  // 处理文生图
  const handleTextToImage = async (formData) => {
    try {
      console.log('开始文生图生成:', formData)

      const taskKey = formData.id || 'new'

      // 添加任务状态
      setTextToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: null,
        progress: 0,
        status: 'starting',
        message: '正在创建任务...'
      })))

      // 使用formData中的内容作为提示词
      const prompt = formData.title?.zh || formData.name?.zh || '生成涂色书图片'

      const requestData = {
        prompt: prompt,
        ratio: formData.ratio || '1:1'
      }

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
        setTextToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: null,
          progress: 0,
          status: 'failed',
          message: result.error || '文生图生成失败'
        })))
        throw new Error(result.error || '文生图生成失败')
      }

      console.log('文生图任务创建成功:', result)

      // 更新任务状态
      setTextToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: result.data.taskId,
        progress: 10,
        status: 'processing',
        message: '任务已创建，正在生成中...'
      })))

      // 开始轮询任务状态
      if (result.data && result.data.taskId) {
        pollTextToImageTask(result.data.taskId, formData, taskKey)
      } else {
        throw new Error('API返回的数据中缺少taskId')
      }

    } catch (error) {
      console.error('文生图生成错误:', error)
      const taskKey = formData.id || 'new'
      // 更新任务状态为失败
      setTextToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: null,
        progress: 0,
        status: 'failed',
        message: error.message
      })))
      setError(`文生图生成失败: ${error.message}`)

      // 3秒后清除失败状态，让用户可以重试
      setTimeout(() => {
        setTextToImageTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(taskKey)
          return newMap
        })
      }, 3000)
    }
  }

  // 处理图生图
  const handleImageToImage = async (formData, uploadedFile) => {
    try {
      console.log('开始图生图生成:', formData, uploadedFile)

      const taskKey = formData.id || 'new'

      // 添加任务状态
      setImageToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: null,
        progress: 0,
        status: 'starting',
        message: '正在上传图片...'
      })))

      // 创建FormData对象上传图片
      const formDataObj = new FormData()

      // 获取prompt文本
      let promptText = ''
      if (formData.title && typeof formData.title === 'object') {
        promptText = formData.title.zh || formData.title.en || ''
      } else if (formData.title && typeof formData.title === 'string') {
        promptText = formData.title
      } else if (formData.name && typeof formData.name === 'object') {
        promptText = formData.name.zh || formData.name.en || ''
      } else if (formData.name && typeof formData.name === 'string') {
        promptText = formData.name
      }

      if (!promptText || promptText.trim() === '') {
        promptText = '生成涂色书图片'
      }

      formDataObj.append('image', uploadedFile)
      formDataObj.append('prompt', promptText)
      formDataObj.append('ratio', formData.ratio || '1:1')

      const response = await fetch('/api/images/image-to-image', {
        method: 'POST',
        body: formDataObj
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('图生图API错误响应:', result)
        // 更新任务状态为失败
        setImageToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: null,
          progress: 0,
          status: 'failed',
          message: result.message || result.error || '图生图生成失败'
        })))
        throw new Error(result.message || result.error || '图生图生成失败')
      }

      console.log('图生图任务创建成功:', result)

      // 如果有用户上传的彩色图片URL，更新formData
      if (result.data.uploadedColorImageUrl) {
        setFormData(prev => ({
          ...prev,
          colorUrl: result.data.uploadedColorImageUrl
        }))
        console.log('已保存用户上传的彩色图片URL:', result.data.uploadedColorImageUrl)
      }

      // 更新任务状态
      setImageToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: result.data.taskId,
        progress: 20,
        status: 'processing',
        message: '图片已上传，正在生成中...'
      })))

      // 开始轮询任务状态
      if (result.data && result.data.taskId) {
        pollImageToImageTask(result.data.taskId, formData, taskKey)
      } else {
        throw new Error('API返回的数据中缺少taskId')
      }

    } catch (error) {
      console.error('图生图生成错误:', error)
      const taskKey = formData.id || 'new'
      // 更新任务状态为失败
      setImageToImageTasks(prev => new Map(prev.set(taskKey, {
        taskId: null,
        progress: 0,
        status: 'failed',
        message: error.message
      })))
      setError(`图生图生成失败: ${error.message}`)

      // 3秒后清除失败状态，让用户可以重试
      setTimeout(() => {
        setImageToImageTasks(prev => {
          const newMap = new Map(prev)
          newMap.delete(taskKey)
          return newMap
        })
      }, 3000)
    }
  }

  // 轮询文生图任务状态
  const pollTextToImageTask = async (taskId, formData, taskKey) => {
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

        // 更新进度
        const progress = Math.min(10 + attempts * 1.5, 90)
        setTextToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: taskId,
          progress: progress,
          status: 'processing',
          message: `正在生成中... (${attempts}/${maxAttempts})`
        })))

        if (result.data && result.data.status === 'completed' && result.data.imageUrl) {
          // 任务完成，更新状态
          setTextToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 100,
            status: 'completed',
            message: '生成完成！'
          })))

          // 更新formData中的图片URL
          setFormData(prev => ({
            ...prev,
            defaultUrl: result.data.imageUrl
          }))

          console.log('文生图生成完成:', result.data.imageUrl)
          setSuccess('文生图生成成功！')

          // 3秒后清除任务状态
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)

          return
        } else if (result.data && result.data.status === 'failed') {
          // 更新任务状态为失败
          setTextToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: result.data.error || '文生图生成失败'
          })))

          setError(`文生图生成失败: ${result.data.error || '未知错误'}`)

          // 3秒后清除失败状态
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)

          return
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000)
        } else {
          // 超时处理
          setTextToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: '文生图生成超时'
          })))

          setError('文生图生成超时，请重试')

          // 3秒后清除超时状态
          setTimeout(() => {
            setTextToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)
        }

      } catch (error) {
        console.error('轮询文生图任务失败:', error)

        // 更新任务状态为失败
        setTextToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: taskId,
          progress: 0,
          status: 'failed',
          message: error.message || '网络错误'
        })))

        setError(`文生图生成失败: ${error.message}`)

        // 3秒后清除失败状态
        setTimeout(() => {
          setTextToImageTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(taskKey)
            return newMap
          })
        }, 3000)
      }
    }

    // 开始轮询
    poll()
  }

  // 轮询图生图任务状态
  const pollImageToImageTask = async (taskId, formData, taskKey) => {
    const maxAttempts = 150 // 最多轮询150次（约9分钟）
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

        // 更新进度
        const progress = Math.min(20 + attempts * 1.3, 90)
        setImageToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: taskId,
          progress: progress,
          status: 'processing',
          message: `正在生成中... (${attempts}/${maxAttempts})`
        })))

        if (result.data && result.data.status === 'completed' && result.data.imageUrl) {
          // 任务完成，更新状态
          setImageToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 100,
            status: 'completed',
            message: '生成完成！'
          })))

          // 更新formData中的图片URL
          setFormData(prev => ({
            ...prev,
            defaultUrl: result.data.imageUrl
          }))

          console.log('图生图生成完成:', result.data.imageUrl)
          setSuccess('图生图生成成功！')

          // 3秒后清除任务状态
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)

          return
        } else if (result.data && result.data.status === 'failed') {
          // 更新任务状态为失败
          setImageToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: result.data.error || '图生图生成失败'
          })))

          setError(`图生图生成失败: ${result.data.error || '未知错误'}`)

          // 3秒后清除失败状态
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)

          return
        }

        // 继续轮询
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000)
        } else {
          // 超时处理
          setImageToImageTasks(prev => new Map(prev.set(taskKey, {
            taskId: taskId,
            progress: 0,
            status: 'failed',
            message: '图生图生成超时'
          })))

          setError('图生图生成超时，请重试')

          // 3秒后清除超时状态
          setTimeout(() => {
            setImageToImageTasks(prev => {
              const newMap = new Map(prev)
              newMap.delete(taskKey)
              return newMap
            })
          }, 3000)
        }

      } catch (error) {
        console.error('轮询图生图任务失败:', error)

        // 更新任务状态为失败
        setImageToImageTasks(prev => new Map(prev.set(taskKey, {
          taskId: taskId,
          progress: 0,
          status: 'failed',
          message: error.message || '网络错误'
        })))

        setError(`图生图生成失败: ${error.message}`)

        // 3秒后清除失败状态
        setTimeout(() => {
          setImageToImageTasks(prev => {
            const newMap = new Map(prev)
            newMap.delete(taskKey)
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
    const taskKey = formData.id || 'new'
    const task = textToImageTasks.get(taskKey)
    return task && (task.status === 'starting' || task.status === 'processing')
  }

  // 检查是否有正在进行的图生图任务
  const isGeneratingImageToImage = (formData) => {
    const taskKey = formData.id || 'new'
    const task = imageToImageTasks.get(taskKey)
    return task && (task.status === 'starting' || task.status === 'processing')
  }

  // 获取文生图任务状态
  const getTextToImageTaskStatus = (formData) => {
    const taskKey = formData.id || 'new'
    return textToImageTasks.get(taskKey)
  }

  // 获取图生图任务状态
  const getImageToImageTaskStatus = (formData) => {
    const taskKey = formData.id || 'new'
    return imageToImageTasks.get(taskKey)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">图片管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={loadImages}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
            <Button
              onClick={startAdd}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增图片
            </Button>
          </div>
        </div>

        {/* 筛选栏 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="搜索图片..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.type || 'all'} onValueChange={(value) => handleFilterChange('type', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {typeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.categoryId || 'all'} onValueChange={(value) => handleFilterChange('categoryId', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.category_id} value={category.category_id.toString()}>
                  {formatMultiLangField(category.display_name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.isPublic || 'all'} onValueChange={(value) => handleFilterChange('isPublic', value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="公开状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="true">公开</SelectItem>
              <SelectItem value="false">私有</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setFilters({
              search: '',
              type: '',
              categoryId: '',
              isPublic: '',
              page: 1,
              limit: 20
            })}
            variant="outline"
            className="flex items-center gap-2"
          >
            清除筛选
          </Button>
        </div>
      </div>

      {/* 错误和成功提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* 图片表单弹窗 */}
      <Dialog
        isOpen={showForm && tags.length >= 0}
        onClose={resetForm}
        title={editingId ? '编辑图片' : '新增图片'}
        maxWidth="max-w-6xl"
      >
        <DialogContent>
          <ImageForm
            formData={formData}
            editingLanguages={editingLanguages}
            supportedLanguages={supportedLanguages}
            categories={categories}
            tags={tags}
            typeOptions={typeOptions}
            ratioOptions={ratioOptions}
            loading={loading}
            onInputChange={handleInputChange}
            onAddLanguage={addLanguage}
            onRemoveLanguage={removeLanguage}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            formatMultiLangField={formatMultiLangField}
            onGenerateColoring={handleSingleImageColoring} // 添加上色回调
            isGeneratingColoring={isGeneratingSingleColoring(formData)} // 添加上色状态
            coloringTaskStatus={getColoringTaskStatus(formData)} // 添加上色任务状态
            onGenerateTranslation={handleGenerateTranslation} // 添加生成翻译回调
            isGeneratingTranslation={isGeneratingTranslationForForm} // 添加生成翻译状态检查函数
            onTextToImage={handleTextToImage} // 添加文生图回调
            isGeneratingTextToImage={isGeneratingTextToImage(formData)} // 添加文生图状态
            textToImageTaskStatus={getTextToImageTaskStatus(formData)} // 添加文生图任务状态
            onImageToImage={handleImageToImage} // 添加图生图回调
            isGeneratingImageToImage={isGeneratingImageToImage(formData)} // 添加图生图状态
            imageToImageTaskStatus={getImageToImageTaskStatus(formData)} // 添加图生图任务状态
          />
        </DialogContent>
      </Dialog>

      {/* 国际化结果展示 */}
      {Object.keys(internationalizationResults).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>国际化结果</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveTranslations}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? '保存中...' : '保存到数据库'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setInternationalizationResults({})
                    setSelectedItems(new Set())
                    setActiveInternationalizationLanguage('') // 清除活跃语言
                  }}
                >
                  清除结果
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 语言选项卡 */}
            <div className="flex flex-wrap gap-2 border-b mb-4">
              {(() => {
                // 获取所有可用的语言
                const allLanguages = new Set()
                Object.values(internationalizationResults).forEach(translations => {
                  Object.keys(translations).forEach(langCode => {
                    allLanguages.add(langCode)
                  })
                })

                return Array.from(allLanguages).map(langCode => {
                  const language = supportedLanguages.find(lang => lang.code === langCode)
                  const isActive = activeInternationalizationLanguage === langCode

                  return (
                    <button
                      key={langCode}
                      type="button"
                      onClick={() => setActiveInternationalizationLanguage(langCode)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {language ? language.name : langCode.toUpperCase()}
                      </div>
                    </button>
                  )
                })
              })()}
            </div>

            {/* 当前语言的翻译内容 */}
            {activeInternationalizationLanguage && (
              <div className="space-y-4">
                {Object.entries(internationalizationResults).map(([imageId, translations]) => {
                  const image = images.find(img => img.id.toString() === imageId.toString())
                  const translation = translations[activeInternationalizationLanguage]

                  if (!image || !translation) {
                    console.warn('⚠️ 未找到匹配的图片或翻译:')
                    console.warn('- imageId:', imageId, '(类型:', typeof imageId, ')')
                    console.warn('- 可用的图片ID列表:', images.map(img => `${img.id}(${typeof img.id})`))
                    console.warn('- translation:', translation)
                    return null
                  }

                  return (
                    <InternationalizationEditor
                      key={imageId}
                      imageId={imageId}
                      languageCode={activeInternationalizationLanguage}
                      translation={translation}
                      originalImage={image}
                      supportedLanguages={supportedLanguages}
                      onTranslationEdit={handleTranslationEdit}
                      onGenerateTranslation={handleGenerateTranslation}
                      isGeneratingTranslation={isGeneratingTranslation(imageId, activeInternationalizationLanguage)}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 图片列表 */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <p className="text-gray-600">管理所有图片内容，支持多语言和批量操作</p>

            {/* 第一行：标题和全选按钮 */}
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                图片列表
                {pagination.total > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({pagination.total} 个图片)
                  </span>
                )}
              </CardTitle>
              {images.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedItems.size === images.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  全选
                </Button>
              )}
            </div>

            {/* 第二行：国际化操作栏 */}
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Languages className="w-4 h-4" />
                    <span className="font-medium">已选择 {selectedItems.size} 个图片</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-blue-700">选择目标语言：</label>
                    <div className="w-64">
                      <MultiSelect
                        options={languageOptions}
                        value={selectedLanguages}
                        onChange={setSelectedLanguages}
                        placeholder="请选择要翻译的语言"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleInternationalization}
                    disabled={internationalizationLoading || selectedLanguages.length === 0}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Languages className="w-4 h-4" />
                    {internationalizationLoading ? '生成中...' : '生成国际化内容'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedItems(new Set())
                      setSelectedLanguages([])
                      setInternationalizationResults({})
                      setActiveInternationalizationLanguage('') // 清除活跃语言
                    }}
                    className="flex items-center gap-2"
                  >
                    取消选择
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">加载中...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无图片数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 图片列表 */}
              <div className="space-y-2">
                {images.map((image) => (
                  <div key={image.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    {/* 选择框 */}
                    <button
                      onClick={() => toggleSelectItem(image.id)}
                      className="flex-shrink-0"
                    >
                      {selectedItems.has(image.id) ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {/* 图片预览 */}
                    <div className="flex-shrink-0">
                      {image.defaultUrl ? (
                        <img
                          src={image.defaultUrl}
                          alt={formatMultiLangField(image.title)}
                          className="w-16 h-16 object-cover rounded border"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className="hidden w-16 h-16 items-center justify-center text-xs text-gray-400 bg-gray-100 rounded border">
                        无图片
                      </div>
                    </div>

                    {/* 图片信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">
                          {formatMultiLangField(image.title)}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${image.type === 'coloring' ? 'bg-blue-100 text-blue-800' :
                          image.type === 'uploaded' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                          {typeOptions.find(opt => opt.value === image.type)?.label || image.type}
                        </span>
                        {image.isPublic && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            公开
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {formatMultiLangField(image.description) || '无描述'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>分类: {getCategoryName(image.categoryId)}</span>
                        <span>比例: {image.ratio}</span>
                        {/* {image.size && <span>尺寸: {image.size}</span>} */}
                        <div className="flex items-center gap-1">
                          <span>热度:</span>
                          <span className="font-medium text-orange-600">{image.hotness || 0}</span>
                          <div className="w-8 h-1 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-400 to-orange-500 rounded-full"
                              style={{ width: `${Math.min(100, (image.hotness || 0) / 10)}%` }}
                            ></div>
                          </div>
                        </div>
                        {image.coloringUrl && (
                          <span className="text-orange-600 font-medium">已上色</span>
                        )}
                        {image.tags && image.tags.length > 0 && (
                          <span>标签: {image.tags.map(tag => formatMultiLangField(tag.display_name)).join(', ')}</span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      {/* 预览按钮 */}
                      {(image.defaultUrl || image.colorUrl || image.coloringUrl) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // 优先显示上色版本，然后是彩色版本，最后是线稿版本
                            const urls = [image.coloringUrl, image.colorUrl, image.defaultUrl].filter(Boolean)
                            if (urls.length > 0) {
                              window.open(urls[0], '_blank')
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}

                      {/* 上色按钮 */}
                      {image.defaultUrl && !image.coloringUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualColoring(image.id, image)}
                          className="flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          title="为图片生成上色版本"
                        >
                          <Palette className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(image)}
                        className="flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(image.id, image.title)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-700">
                    第 {pagination.page} 页，共 {pagination.pages} 页 (总计 {pagination.total} 个图片)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ImagesManager 