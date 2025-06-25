import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Check, CheckCircle, Clock, Edit3, Home, Image, ImageIcon, PlusCircle, Save, Settings, Tag, Trash2, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import CategoriesManager from './components/CategoriesManager'
import ImagesManager from './components/ImagesManager'
import TagsManager from './components/TagsManager'

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
                  // 显示生成的主题，添加默认图片比例
                  setContentList(prev => [...prev, {
                    ...data.content,
                    imagePath: null,
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
  const generateContent = async () => {
    if (contentList.length === 0) {
      alert('请先生成主题')
      return
    }

    // 只为还没有文案的项目生成内容
    const itemsToGenerate = contentList.filter(item => !item.content)

    if (itemsToGenerate.length === 0) {
      alert('所有主题都已生成文案！')
      return
    }

    setIsGeneratingContent(true)
    setGenerationProgress({ current: 0, total: itemsToGenerate.length, message: `准备为${itemsToGenerate.length}个主题生成文案...` })

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
            title: item.title,
            prompt: item.prompt,
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
      const imagesToSave = contentList
        .filter(item => selectedImages.has(item.id) && item.imagePath)
        .map(item => {
          const categoryId = imageCategorySelections.get(item.id) || null
          const tagIds = Array.from(imageTagSelections.get(item.id) || [])

          return {
            title: item.title,
            description: item.description,
            imagePath: item.imagePath,
            prompt: item.prompt,
            ratio: item.imageRatio || '1:1',
            type: 'generated',
            categoryId: categoryId,
            tagIds: tagIds,
            userId: 'frontend_user',
            additionalInfo: {
              source: 'frontend_generation',
              keyword: formData.keyword,
              originalIndex: item.index
            }
          }
        })

      if (imagesToSave.length === 0) {
        alert('选中的项目中没有已生成的图片')
        return
      }

      const response = await fetch('/api/db-images/save-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ images: imagesToSave })
      })

      const result = await response.json()

      if (result.success) {
        alert(`成功保存 ${result.data.totalSaved}/${result.data.totalRequested} 张图片到数据库`)
        setSelectedImages(new Set()) // 清空选择
        setImageCategorySelections(new Map()) // 清空分类选择
        setImageTagSelections(new Map()) // 清空标签选择

        if (result.errors && result.errors.length > 0) {
          console.warn('部分图片保存失败:', result.errors)
        }
      } else {
        alert('保存失败: ' + result.message)
      }
    } catch (error) {
      console.error('保存图片时出错:', error)
      alert('保存图片时出错: ' + error.message)
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
    const imagesWithPath = contentList.filter(item => item.imagePath)
    if (selectedImages.size === imagesWithPath.length) {
      setSelectedImages(new Set()) // 取消全选
    } else {
      setSelectedImages(new Set(imagesWithPath.map(item => item.id))) // 全选
    }
  }

  // 直接保存选中的图片
  const handleSaveImages = async () => {
    if (selectedImages.size === 0) {
      alert('请先选择要保存的图片')
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
                  {/* 流程说明 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-amber-800 mb-2">操作流程说明</div>
                        <div className="text-sm text-amber-700 space-y-1">
                          <div>• <strong>第一步：</strong>生成主题 - 根据关键词创建多个不同的涂色主题和AI绘图指令</div>
                          <div>• <strong>第二步：</strong>生成文案 - 为每个主题创建详细的涂色指导内容</div>
                          <div>• <strong>第三步：</strong>生成图片 - 使用AI根据指令生成专业涂色页图片</div>
                          <div>• <strong>最后：</strong>保存数据 - 选择需要的内容保存到数据库中</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 步骤按钮 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          onClick={generateContent}
                          disabled={isGeneratingContent || contentList.length === 0}
                          variant="outline"
                          className="w-full border-green-300 text-green-700 hover:bg-green-50"
                          size="sm"
                        >
                          {isGeneratingContent ? '生成中...' : '生成文案'}
                        </Button>
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
                          {imageProgress.message}
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
                                  <span className="text-gray-500 truncate max-w-40">{detail.title}</span>
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
                </CardContent>
              </Card>

              {/* 步骤3：保存设置（只在有图片时显示） */}
              {contentList.some(item => item.imagePath) && (
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
                        {selectedImages.size === contentList.filter(item => item.imagePath).length ? '取消全选' : '全选图片'}
                      </Button>

                      <Button
                        onClick={handleSaveImages}
                        disabled={selectedImages.size === 0 || isSaving}
                        className="flex items-center gap-2"
                        size="sm"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? '保存中...' : `保存到数据库 (${selectedImages.size})`}
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
                                    <h3 className="font-medium text-gray-900 truncate">{item.title}</h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => startEdit(item.id, 'title', item.title)}
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </Button>
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

                          {/* 分类和标签选择 - 简化样式 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <Label className="text-sm text-gray-600 mb-1 block">分类</Label>
                              <Select
                                value={imageCategorySelections.get(item.id) || ''}
                                onValueChange={(value) => setImageCategory(item.id, value)}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="选择分类" />
                                </SelectTrigger>
                                <SelectContent>
                                  {saveOptions.categories.map(category => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {typeof category.name === 'string'
                                        ? category.name
                                        : category.name?.zh || category.name?.en || '未知分类'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600 mb-1 block">标签</Label>
                              <div className="relative">
                                <Select
                                  value="" // 不需要设置value，因为是多选
                                  onValueChange={(tagId) => toggleImageTag(item.id, parseInt(tagId))}
                                >
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue>
                                      {(() => {
                                        const selectedTags = imageTagSelections.get(item.id) || new Set()
                                        if (selectedTags.size === 0) {
                                          return <span className="text-gray-500">选择标签</span>
                                        }
                                        const selectedTagNames = saveOptions.tags
                                          .filter(tag => selectedTags.has(tag.id))
                                          .map(tag => typeof tag.name === 'string' ? tag.name : tag.name?.zh || tag.name?.en || '未知')

                                        if (selectedTagNames.length <= 2) {
                                          return selectedTagNames.join(', ')
                                        } else {
                                          return `${selectedTagNames.slice(0, 2).join(', ')} +${selectedTagNames.length - 2}`
                                        }
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {saveOptions.tags.map(tag => {
                                      const isSelected = imageTagSelections.get(item.id)?.has(tag.id) || false
                                      const tagName = typeof tag.name === 'string' ? tag.name : tag.name?.zh || tag.name?.en || '未知标签'

                                      return (
                                        <SelectItem key={tag.id} value={tag.id.toString()}>
                                          <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                              }`}>
                                              {isSelected && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span>{tagName}</span>
                                          </div>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* 显示已选标签 */}
                              {(() => {
                                const selectedTags = imageTagSelections.get(item.id) || new Set()
                                if (selectedTags.size === 0) return null

                                return (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {saveOptions.tags
                                      .filter(tag => selectedTags.has(tag.id))
                                      .map(tag => (
                                        <span
                                          key={tag.id}
                                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded"
                                        >
                                          {typeof tag.name === 'string' ? tag.name : tag.name?.zh || tag.name?.en || '未知'}
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              toggleImageTag(item.id, tag.id)
                                            }}
                                            className="hover:bg-blue-200 rounded p-0.5"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))
                                    }
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* 详细信息区域 - 可展开 */}
                          <div className="space-y-3">
                            {/* 基本信息行 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {/* 描述 */}
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Label className="text-xs text-gray-600">描述</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(item.id, 'description', item.description)}
                                    className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                                {editingId === item.id && editingField === 'description' ? (
                                  <div className="flex gap-1">
                                    <Textarea
                                      value={editingValue}
                                      onChange={(e) => setEditingValue(e.target.value)}
                                      className="flex-1 text-xs"
                                      rows={2}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <Button size="sm" onClick={saveEdit} className="h-5 w-5 p-0">
                                        <Check className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-5 w-5 p-0">
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-700 line-clamp-2">{item.description}</p>
                                )}
                              </div>

                              {/* 图片比例 */}
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <Label className="text-xs text-gray-600">图片比例</Label>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => startEdit(item.id, 'imageRatio', item.imageRatio || globalImageRatio)}
                                    className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </Button>
                                </div>
                                {editingId === item.id && editingField === 'imageRatio' ? (
                                  <div className="flex gap-1">
                                    <Select value={editingValue} onValueChange={setEditingValue}>
                                      <SelectTrigger className="h-7 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1:1">正方形 (1:1)</SelectItem>
                                        <SelectItem value="3:2">横向 (3:2)</SelectItem>
                                        <SelectItem value="2:3">纵向 (2:3)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={saveEdit} className="h-7 w-7 p-0">
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 w-7 p-0">
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-700">
                                    {item.imageRatio || globalImageRatio}
                                    {!item.imageRatio && <span className="text-gray-400 ml-1">(默认)</span>}
                                  </span>
                                )}
                              </div>

                              {/* 生成的图片 */}
                              <div>
                                {item.imagePath && (
                                  <>
                                    <Label className="text-xs text-gray-600 block mb-1">生成的图片</Label>
                                    <div className="w-16 h-16 rounded border border-gray-200 overflow-hidden">
                                      <img
                                        src={`/${item.imagePath}`}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.style.display = 'none'
                                          e.target.nextSibling.style.display = 'flex'
                                        }}
                                      />
                                      <div className="hidden w-full h-full items-center justify-center text-xs text-gray-400 bg-gray-50">
                                        加载失败
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* AI提示词 */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Label className="text-xs text-gray-600">AI提示词</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(item.id, 'prompt', item.prompt)}
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                              {editingId === item.id && editingField === 'prompt' ? (
                                <div className="flex gap-1">
                                  <Textarea
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="flex-1 text-xs"
                                    rows={2}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <Button size="sm" onClick={saveEdit} className="h-5 w-5 p-0">
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-5 w-5 p-0">
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded border line-clamp-2">{item.prompt}</p>
                              )}
                            </div>

                            {/* 内容文案 */}
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Label className="text-xs text-gray-600">内容文案</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(item.id, 'content', item.content)}
                                  className="h-4 w-4 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                              {editingId === item.id && editingField === 'content' ? (
                                <div className="flex gap-1">
                                  <Textarea
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="flex-1 text-xs"
                                    rows={6}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <Button size="sm" onClick={saveEdit} className="h-5 w-5 p-0">
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-5 w-5 p-0">
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded border max-h-20 overflow-y-auto whitespace-pre-wrap">
                                  {item.content || (
                                    <span className="text-gray-400 italic">暂无文案内容</span>
                                  )}
                                </div>
                              )}
                            </div>
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
                              <h3 className="font-medium text-gray-900">{item.title}</h3>
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
                                          {translation.name || '未翻译'}
                                        </p>
                                      </div>

                                      <div>
                                        <Label className="text-xs text-gray-600">内容</Label>
                                        <div className="text-sm text-gray-900 bg-white p-2 rounded border max-h-32 overflow-y-auto whitespace-pre-wrap">
                                          {translation.description || '未翻译'}
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
      </div>
    </div>
  )
}

export default App