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
  Languages,
  Plus,
  RefreshCw,
  Save,
  Square,
  Trash2
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

const CategoriesManager = () => {
  // 状态管理
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showInternationalization, setShowInternationalization] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [internationalizationLoading, setInternationalizationLoading] = useState(false)
  const [internationalizationResults, setInternationalizationResults] = useState({})

  // 图片相关状态
  const [availableImages, setAvailableImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  // 表单状态
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    displayName: { zh: '' },
    description: { zh: '' },
    imageId: ''
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

  // 加载分类列表
  const loadCategories = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/categories')
      const data = await response.json()

      if (data.success) {
        setCategories(data.data)
      } else {
        setError(data.message || '加载分类失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 加载图片列表
  const loadImages = async () => {
    try {
      const response = await fetch('/api/images?limit=100') // 获取前100张图片
      const data = await response.json()

      if (data.success) {
        setAvailableImages(data.data)
      } else {
        console.error('加载图片失败:', data.message)
      }
    } catch (err) {
      console.error('加载图片网络错误:', err.message)
    }
  }

  // 根据图片ID获取图片详情
  const getImageById = (imageId) => {
    return availableImages.find(img => img.id === imageId) || null
  }

  // 初始加载
  useEffect(() => {
    loadCategories()
    loadImages()
  }, [])

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
      displayName: { zh: '' },
      description: { zh: '' },
      imageId: ''
    })
    setEditingId(null)
    setShowForm(false)
  }

  // 处理表单输入
  const handleInputChange = (field, lang, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value
      }
    }))
  }

  // 获取分类的现有语言
  const getExistingLanguages = (category) => {
    const languages = new Set(['zh']) // 中文是必须的

    if (category.display_name) {
      let displayName = {}
      if (typeof category.display_name === 'string') {
        try {
          displayName = JSON.parse(category.display_name)
        } catch {
          displayName = { zh: category.display_name }
        }
      } else if (typeof category.display_name === 'object') {
        displayName = category.display_name || {}
      }

      Object.keys(displayName).forEach(lang => {
        if (displayName[lang] && displayName[lang].trim()) {
          languages.add(lang)
        }
      })
    }

    return Array.from(languages)
  }

  // 开始编辑
  const startEdit = (category) => {
    // 数据库字段名是 display_name 和 description
    let displayName = {}
    let description = {}

    // 处理 display_name 字段
    if (typeof category.display_name === 'string') {
      try {
        displayName = JSON.parse(category.display_name)
      } catch {
        displayName = { zh: category.display_name }
      }
    } else if (typeof category.display_name === 'object') {
      displayName = category.display_name || {}
    }

    // 处理 description 字段
    if (typeof category.description === 'string') {
      try {
        description = JSON.parse(category.description)
      } catch {
        description = { zh: category.description }
      }
    } else if (typeof category.description === 'object') {
      description = category.description || {}
    }

    const imageId = category.image_id || ''
    setFormData({
      displayName: displayName || { zh: '' },
      description: description || { zh: '' },
      imageId: imageId
    })

    // 设置选中的图片
    if (imageId) {
      const image = getImageById(imageId)
      setSelectedImage(image)
    } else {
      setSelectedImage(null)
    }

    setEditingId(category.category_id)
    setShowForm(true)
  }

  // 开始新增
  const startAdd = () => {
    resetForm()
    setSelectedImage(null)
    setShowForm(true)
  }

  // 处理图片选择
  const handleImageSelect = (imageId) => {
    setFormData(prev => ({ ...prev, imageId }))

    if (imageId) {
      const image = getImageById(imageId)
      setSelectedImage(image)
    } else {
      setSelectedImage(null)
    }
  }

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault()

    // 验证必填字段
    if (!formData.displayName.zh?.trim()) {
      setError('请输入中文名称')
      return
    }

    setLoading(true)
    setError('')

    try {
      const requestData = {
        displayName: formData.displayName,
        description: formData.description,
        imageId: formData.imageId.trim()
      }

      let response
      if (editingId) {
        // 更新
        response = await fetch(`/api/categories/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
      } else {
        // 新增
        response = await fetch('/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(editingId ? '分类更新成功！' : '分类创建成功！')
        resetForm()
        loadCategories() // 重新加载列表
      } else {
        setError(data.message || '操作失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 删除分类
  const handleDelete = async (categoryId, displayName) => {
    if (!window.confirm(`确定要删除分类 "${displayName}" 吗？`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('分类删除成功！')
        loadCategories() // 重新加载列表
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
    if (selectedItems.size === categories.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(categories.map(cat => cat.category_id)))
    }
  }

  // 切换单个选择
  const toggleSelectItem = (categoryId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId)
    } else {
      newSelected.add(categoryId)
    }
    setSelectedItems(newSelected)
  }

  // 执行国际化
  const handleInternationalization = async () => {
    if (selectedItems.size === 0) {
      setError('请先选择要国际化的分类')
      return
    }

    if (selectedLanguages.length === 0) {
      setError('请选择要翻译的语言')
      return
    }

    setInternationalizationLoading(true)
    setError('')

    try {
      const selectedCategories = categories.filter(cat => selectedItems.has(cat.category_id))

      const requestData = {
        type: 'categories',
        items: selectedCategories.map(cat => ({
          id: cat.category_id,
          name: formatDisplayName(cat.display_name),
          description: formatDescription(cat.description)
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
        console.log('国际化翻译结果:', data.results)
        setInternationalizationResults(data.results)
        setSuccess(`成功为 ${selectedItems.size} 个分类生成了 ${selectedLanguages.length} 种语言的翻译`)
      } else {
        console.error('国际化失败:', data)
        setError(data.message || '国际化失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setInternationalizationLoading(false)
    }
  }

  const formatDisplayName = (display_name) => {
    if (!display_name) return '未命名'

    if (typeof display_name === 'string') {
      try {
        const parsed = JSON.parse(display_name)
        return parsed.zh || parsed.en || display_name
      } catch {
        return display_name
      }
    }

    if (typeof display_name === 'object') {
      return display_name.zh || display_name.en || '未命名'
    }

    return '未命名'
  }

  const formatDescription = (description) => {
    if (!description) return ''

    if (typeof description === 'string') {
      try {
        const parsed = JSON.parse(description)
        return parsed.zh || parsed.en || description
      } catch {
        return description
      }
    }

    if (typeof description === 'object') {
      return description.zh || description.en || ''
    }

    return ''
  }

  const handleSaveTranslations = async () => {
    if (Object.keys(internationalizationResults).length === 0) {
      setError('没有翻译结果需要保存')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/internationalization/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'categories',
          translations: internationalizationResults
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`翻译保存成功！保存了 ${data.savedCount} 个分类的翻译`)
        setInternationalizationResults({})
        setSelectedItems(new Set())
        setShowInternationalization(false)
        setSelectedLanguages([])
        // 重新加载数据以显示最新的翻译
        loadCategories()
      } else {
        setError(data.message || '保存失败')
        if (data.errors && data.errors.length > 0) {
          setError(data.message + '：' + data.errors.join(', '))
        }
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTranslationEdit = (categoryId, langCode, field, value) => {
    setInternationalizationResults(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [langCode]: {
          ...prev[categoryId][langCode],
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">分类管理</h1>
          <div className="flex gap-2">
            <Button
              onClick={loadCategories}
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
              新增分类
            </Button>
          </div>
        </div>

        {/* 国际化操作栏 */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Languages className="w-4 h-4" />
              <span className="font-medium">已选择 {selectedItems.size} 个分类</span>
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

      {/* 国际化设置面板 */}
      {showInternationalization && (
        <Card>
          <CardHeader>
            <CardTitle>国际化设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>选择目标语言（多选）</Label>
                <div className="mt-2">
                  <MultiSelect
                    options={languageOptions}
                    value={selectedLanguages}
                    onChange={setSelectedLanguages}
                    placeholder="请选择要翻译的语言"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInternationalization}
                  disabled={internationalizationLoading || selectedItems.size === 0 || selectedLanguages.length === 0}
                  className="flex items-center gap-2"
                >
                  <Languages className="w-4 h-4" />
                  {internationalizationLoading ? '生成中...' : '生成国际化内容'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInternationalization(false)
                    setSelectedLanguages([])
                    setInternationalizationResults({})
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
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
              {Object.entries(internationalizationResults).map(([categoryId, translations]) => {
                const category = categories.find(cat => cat.category_id.toString() === categoryId)
                if (!category) return null

                return (
                  <div key={categoryId} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      {formatDisplayName(category.display_name)} (ID: {categoryId})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(translations).map(([langCode, content]) => {
                        const language = supportedLanguages.find(l => l.code === langCode)
                        console.log(`语言映射调试 - langCode: ${langCode}, language:`, language, 'content:', content)
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
                                  onChange={(e) => handleTranslationEdit(categoryId, langCode, 'name', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译名称"
                                />
                              </div>
                              {(content.description !== undefined) && (
                                <div>
                                  <Label className="text-xs text-gray-500">描述</Label>
                                  <Textarea
                                    value={content.description || ''}
                                    onChange={(e) => handleTranslationEdit(categoryId, langCode, 'description', e.target.value)}
                                    className="mt-1 text-sm"
                                    placeholder="翻译描述"
                                    rows={2}
                                  />
                                </div>
                              )}
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

      {/* 新增/编辑表单 */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? '编辑分类' : '新增分类'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 根据现有语言显示多语言输入框 */}
              {(() => {
                const languages = editingId
                  ? getExistingLanguages(categories.find(cat => cat.category_id === editingId))
                  : ['zh']

                return (
                  <>
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">名称</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {languages.map(langCode => {
                          const language = supportedLanguages.find(l => l.code === langCode) || { name: langCode === 'zh' ? '中文' : langCode }
                          return (
                            <div key={langCode}>
                              <Label htmlFor={`displayName_${langCode}`}>
                                {language.name} {langCode === 'zh' && '*'}
                              </Label>
                              <Input
                                id={`displayName_${langCode}`}
                                value={formData.displayName[langCode] || ''}
                                onChange={(e) => handleInputChange('displayName', langCode, e.target.value)}
                                placeholder={`请输入${language.name}名称${langCode === 'zh' ? '（必填）' : '（可选）'}`}
                                required={langCode === 'zh'}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">描述</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {languages.map(langCode => {
                          const language = supportedLanguages.find(l => l.code === langCode) || { name: langCode === 'zh' ? '中文' : langCode }
                          return (
                            <div key={langCode}>
                              <Label htmlFor={`description_${langCode}`}>
                                {language.name}描述
                              </Label>
                              <Textarea
                                id={`description_${langCode}`}
                                value={formData.description[langCode] || ''}
                                onChange={(e) => handleInputChange('description', langCode, e.target.value)}
                                placeholder={`请输入${language.name}描述（可选）`}
                                rows={3}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )
              })()}

              <div>
                <Label htmlFor="imageId">关联图片</Label>
                <Select value={formData.imageId || "none"} onValueChange={(value) => handleImageSelect(value === "none" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择关联的图片（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">无关联图片</SelectItem>
                    {availableImages.map((image) => {
                      // 解析图片标题
                      let title = '未命名图片'
                      if (image.title) {
                        if (typeof image.title === 'string') {
                          try {
                            const parsed = JSON.parse(image.title)
                            title = parsed.zh || parsed.en || title
                          } catch {
                            title = image.title
                          }
                        } else if (typeof image.title === 'object') {
                          title = image.title.zh || image.title.en || title
                        }
                      }

                      return (
                        <SelectItem key={image.id} value={image.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-500">{image.id.slice(0, 8)}...</span>
                            <span>{title}</span>
                            <span className="text-xs text-gray-400">({image.type})</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {/* 选中图片的预览 */}
                {selectedImage && (
                  <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="text-sm font-medium text-gray-700 mb-2">选中的图片预览</div>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-600">
                        <span className="font-medium">ID:</span> {selectedImage.id}
                      </div>

                      {/* 黑白图片预览 */}
                      {selectedImage.defaultUrl && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="font-medium">黑白图片 (defaultUrl):</span>
                          </div>
                          <div className="w-32 h-32 border border-gray-200 rounded overflow-hidden bg-white">
                            <img
                              src={selectedImage.defaultUrl}
                              alt="黑白图片预览"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-xs text-gray-400 bg-gray-100">
                              加载失败
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 上色图片预览 */}
                      {selectedImage.coloringUrl && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="font-medium">上色图片 (coloringUrl):</span>
                          </div>
                          <div className="w-32 h-32 border border-gray-200 rounded overflow-hidden bg-white">
                            <img
                              src={selectedImage.coloringUrl}
                              alt="上色图片预览"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-xs text-gray-400 bg-gray-100">
                              加载失败
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 如果两个URL都为空的提示 */}
                      {!selectedImage.defaultUrl && !selectedImage.coloringUrl && (
                        <div className="text-xs text-gray-500 italic">
                          该图片暂无可预览的URL
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? '保存中...' : (editingId ? '更新分类' : '创建分类')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 分类列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>分类列表 ({categories.length})</CardTitle>
            {categories.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedItems.size === categories.length ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedItems.size === categories.length ? '取消全选' : '全选'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              加载中...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无分类数据
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-center w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="p-0 h-auto"
                      >
                        {selectedItems.size === categories.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">ID</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">名称</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">描述</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">语言</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">关联图片</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const existingLanguages = getExistingLanguages(category)
                    return (
                      <tr key={category.category_id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSelectItem(category.category_id)}
                            className="p-0 h-auto"
                          >
                            {selectedItems.has(category.category_id) ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </Button>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {category.category_id}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="font-medium">
                            {formatDisplayName(category.display_name)}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2 max-w-xs">
                          <div className="truncate" title={formatDescription(category.description)}>
                            {formatDescription(category.description) || '暂无描述'}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {existingLanguages.map(langCode => {
                              const language = supportedLanguages.find(l => l.code === langCode)
                              return (
                                <span
                                  key={langCode}
                                  className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                >
                                  {language ? language.name : (langCode === 'zh' ? '中文' : langCode)}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {category.image_id ? (() => {
                            const image = getImageById(category.image_id)
                            if (!image) {
                              return (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-400">?</span>
                                  </div>
                                  <div className="text-xs text-red-500">
                                    图片未找到
                                    <div className="font-mono text-gray-400">{category.image_id.slice(0, 8)}...</div>
                                  </div>
                                </div>
                              )
                            }

                            // 解析图片标题
                            let title = '未命名图片'
                            if (image.title) {
                              if (typeof image.title === 'string') {
                                try {
                                  const parsed = JSON.parse(image.title)
                                  title = parsed.zh || parsed.en || title
                                } catch {
                                  title = image.title
                                }
                              } else if (typeof image.title === 'object') {
                                title = image.title.zh || image.title.en || title
                              }
                            }

                            const hasPreviewUrl = image.defaultUrl || image.coloringUrl
                            const previewUrl = image.defaultUrl || image.coloringUrl

                            return (
                              <div className="flex items-center gap-2">
                                {/* 缩略图 */}
                                <div className="w-8 h-8 border border-gray-200 rounded overflow-hidden bg-gray-50">
                                  {hasPreviewUrl ? (
                                    <img
                                      src={previewUrl}
                                      alt="图片预览"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = 'none'
                                        e.target.nextSibling.style.display = 'flex'
                                      }}
                                    />
                                  ) : null}
                                  <div className={`${hasPreviewUrl ? 'hidden' : 'flex'} w-full h-full items-center justify-center text-xs text-gray-400`}>
                                    无图
                                  </div>
                                </div>

                                {/* 图片信息 */}
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-medium text-gray-900 truncate" title={title}>
                                    {title}
                                  </div>
                                  <div className="text-xs text-gray-500 font-mono">
                                    {image.id.slice(0, 8)}...
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    {image.defaultUrl && (
                                      <span className="inline-block px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                        默认
                                      </span>
                                    )}
                                    {image.coloringUrl && (
                                      <span className="inline-block px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                        上色
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })() : (
                            <div className="text-xs text-gray-500">未关联</div>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-2 text-sm text-gray-500">
                          {category.created_at ? new Date(category.created_at).toLocaleString('zh-CN') : '未知'}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(category)}
                              className="flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(category.category_id, formatDisplayName(category.display_name))}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CategoriesManager 