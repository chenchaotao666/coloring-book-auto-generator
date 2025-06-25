import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertCircle,
  Check,
  CheckSquare,
  Edit3,
  Eye,
  Image as ImageIcon,
  Languages,
  Plus,
  RefreshCw,
  Save,
  Search,
  Square,
  Trash2
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

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
    { value: '1:1', label: '正方形 (1:1)' },
    { value: '3:2', label: '横向 (3:2)' },
    { value: '2:3', label: '纵向 (2:3)' },
    { value: '4:3', label: '横向 (4:3)' },
    { value: '3:4', label: '纵向 (3:4)' },
    { value: '16:9', label: '宽屏 (16:9)' }
  ]

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

    setFormData({
      name: parseField(image.name),
      title: parseField(image.title),
      description: parseField(image.description),
      prompt: parseField(image.prompt),
      defaultUrl: image.defaultUrl || '',
      colorUrl: image.colorUrl || '',
      coloringUrl: image.coloringUrl || '',
      type: image.type || 'text2image',
      ratio: image.ratio || '1:1',
      isPublic: image.isPublic || false,
      categoryId: image.categoryId || null,
      size: image.size || '',
      tagIds: image.tags ? image.tags.map(tag => tag.tag_id) : []
    })
    setEditingId(image.id)
    setShowForm(true)
  }

  // 开始新增
  const startAdd = () => {
    resetForm()
    setShowForm(true)
  }

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

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
        setSuccess(editingId ? '图片更新成功' : '图片创建成功')
        resetForm()
        loadImages()
      } else {
        setError(data.message || '操作失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
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
        prompt: formatMultiLangField(img.prompt)
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
          additionalInfo: currentImage.additionalInfo,
          tagIds: currentImage.tags ? currentImage.tags.map(tag => tag.tag_id) : [],
          // 更新多语言字段
          name: mergeMultiLangField(currentImage.name, translations, 'name'),
          title: mergeMultiLangField(currentImage.title, translations, 'title'),
          description: mergeMultiLangField(currentImage.description, translations, 'description'),
          prompt: mergeMultiLangField(currentImage.prompt, translations, 'prompt')
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

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">图片管理</h2>
            <p className="text-gray-600 mt-1">管理所有图片内容，支持多语言和批量操作</p>
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

        {/* 国际化操作栏 */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Languages className="w-4 h-4" />
              <span className="font-medium">已选择 {selectedItems.size} 个图片</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium text-blue-700">选择目标语言：</label>
              <div className="min-w-64">
                <MultiSelect
                  options={languageOptions}
                  value={selectedLanguages}
                  onChange={setSelectedLanguages}
                  placeholder="请选择要翻译的语言"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleInternationalization}
                disabled={internationalizationLoading || selectedLanguages.length === 0}
                className="flex items-center gap-2"
              >
                <Languages className="w-4 h-4" />
                {internationalizationLoading ? '生成中...' : '生成国际化内容'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedItems(new Set())
                  setSelectedLanguages([])
                  setInternationalizationResults({})
                }}
                className="flex items-center gap-2"
              >
                取消选择
              </Button>
            </div>
          </div>
        )}

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

      {/* 图片表单 */}
      {showForm && tags.length >= 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? '编辑图片' : '新增图片'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基础信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>名称（中文）*</Label>
                    <Input
                      value={formData.name.zh}
                      onChange={(e) => handleInputChange('name', 'zh', e.target.value)}
                      placeholder="输入图片名称"
                      required
                    />
                  </div>
                  <div>
                    <Label>标题（中文）*</Label>
                    <Input
                      value={formData.title.zh}
                      onChange={(e) => handleInputChange('title', 'zh', e.target.value)}
                      placeholder="输入图片标题"
                      required
                    />
                  </div>
                  <div>
                    <Label>类型</Label>
                    <Select value={formData.type} onValueChange={(value) => handleInputChange('type', null, value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>比例</Label>
                    <Select value={formData.ratio} onValueChange={(value) => handleInputChange('ratio', null, value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ratioOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>分类</Label>
                    <Select value={formData.categoryId ? formData.categoryId.toString() : 'none'} onValueChange={(value) => handleInputChange('categoryId', null, value === 'none' ? null : parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无分类</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category.category_id} value={category.category_id.toString()}>
                            {formatMultiLangField(category.display_name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>标签</Label>
                    <MultiSelect
                      options={(tags || []).map(tag => ({
                        value: tag.tag_id.toString(),
                        label: formatMultiLangField(tag.display_name)
                      }))}
                      value={(formData.tagIds || []).map(id => id.toString())}
                      onChange={(values) => handleInputChange('tagIds', null, (values || []).map(v => parseInt(v)))}
                      placeholder="选择标签"
                    />
                  </div>
                  <div>
                    <Label>尺寸</Label>
                    <Input
                      value={formData.size}
                      onChange={(e) => handleInputChange('size', null, e.target.value)}
                      placeholder="如：512,512"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={formData.isPublic}
                      onChange={(e) => handleInputChange('isPublic', null, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
                      公开图片
                    </Label>
                  </div>
                </div>
              </div>

              {/* 图片URL */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">图片地址</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>默认图片URL</Label>
                    <Input
                      value={formData.defaultUrl}
                      onChange={(e) => handleInputChange('defaultUrl', null, e.target.value)}
                      placeholder="黑白涂色图URL"
                    />
                  </div>
                  <div>
                    <Label>彩色图片URL</Label>
                    <Input
                      value={formData.colorUrl}
                      onChange={(e) => handleInputChange('colorUrl', null, e.target.value)}
                      placeholder="用户上传的彩色图URL"
                    />
                  </div>
                  <div>
                    <Label>上色结果URL</Label>
                    <Input
                      value={formData.coloringUrl}
                      onChange={(e) => handleInputChange('coloringUrl', null, e.target.value)}
                      placeholder="AI上色后的图片URL"
                    />
                  </div>
                </div>
              </div>

              {/* 多语言内容 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">内容描述</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>描述（中文）</Label>
                    <Textarea
                      value={formData.description.zh}
                      onChange={(e) => handleInputChange('description', 'zh', e.target.value)}
                      placeholder="输入图片描述"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>AI提示词（中文）</Label>
                    <Textarea
                      value={formData.prompt.zh}
                      onChange={(e) => handleInputChange('prompt', 'zh', e.target.value)}
                      placeholder="用于生成图片的AI提示词"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* 表单按钮 */}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? '保存中...' : (editingId ? '更新' : '创建')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
                  }}
                >
                  清除结果
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(internationalizationResults).map(([imageId, translations]) => {
                const image = images.find(img => img.id === imageId)
                if (!image) return null

                return (
                  <div key={imageId} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      {formatMultiLangField(image.title)} (ID: {imageId})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(translations).map(([langCode, content]) => {
                        const language = supportedLanguages.find(l => l.code === langCode)
                        return (
                          <div key={langCode} className="bg-gray-50 p-4 rounded-lg">
                            <div className="font-medium text-sm text-gray-600 mb-3">
                              {language?.name || langCode}
                            </div>
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-gray-500">名称</Label>
                                <Input
                                  value={content.name || ''}
                                  onChange={(e) => handleTranslationEdit(imageId, langCode, 'name', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译名称"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">标题</Label>
                                <Input
                                  value={content.title || ''}
                                  onChange={(e) => handleTranslationEdit(imageId, langCode, 'title', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译标题"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">描述</Label>
                                <Textarea
                                  value={content.description || ''}
                                  onChange={(e) => handleTranslationEdit(imageId, langCode, 'description', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译描述"
                                  rows={2}
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">提示词</Label>
                                <Textarea
                                  value={content.prompt || ''}
                                  onChange={(e) => handleTranslationEdit(imageId, langCode, 'prompt', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译提示词"
                                  rows={2}
                                />
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
          </CardContent>
        </Card>
      )}

      {/* 图片列表 */}
      <Card>
        <CardHeader>
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
                        {image.size && <span>尺寸: {image.size}</span>}
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
                            // 简单的图片预览逻辑
                            const urls = [image.defaultUrl, image.colorUrl, image.coloringUrl].filter(Boolean)
                            if (urls.length > 0) {
                              window.open(urls[0], '_blank')
                            }
                          }}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
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