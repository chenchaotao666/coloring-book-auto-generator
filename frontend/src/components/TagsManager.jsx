import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/config/api'
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
  Trash2,
  X
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { eventBus } from '../utils/eventBus'

const TagsManager = () => {
  // 状态管理
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [internationalizationLoading, setInternationalizationLoading] = useState(false)
  const [internationalizationResults, setInternationalizationResults] = useState({})
  const [activeInternationalizationLanguage, setActiveInternationalizationLanguage] = useState('') // 国际化结果的活跃语言tab

  // 确认对话框
  const confirm = useConfirm()

  // 表单状态
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    displayName: { zh: '' },
    description: { zh: '' }
  })

  // 支持的语言
  const supportedLanguages = [
    { code: 'zh', name: '中文' },
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

  // 加载标签列表
  const loadTags = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/tags')
      const data = await response.json()

      if (data.success) {
        setTags(data.data)
      } else {
        setError(data.message || '加载标签失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载
  useEffect(() => {
    loadTags()
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
      description: { zh: '' }
    })
    setEditingId(null)
    setShowForm(false)
  }

  // 删除语言
  const handleDeleteLanguage = (langCode) => {
    if (!editingId) return // 只在编辑时允许删除

    const currentLanguages = getExistingLanguages(tags.find(tag => tag.tag_id === editingId))

    // 不能删除必需的语言(中文)，也不能删除最后一个语言
    if (langCode === 'zh' || currentLanguages.length <= 1) {
      alert('无法删除此语言')
      return
    }

    // 从表单数据中删除该语言的内容
    setFormData(prev => {
      const newData = { ...prev }
      if (newData.displayName) {
        const { [langCode]: _, ...restDisplayName } = newData.displayName
        newData.displayName = restDisplayName
      }
      if (newData.description) {
        const { [langCode]: __, ...restDescription } = newData.description
        newData.description = restDescription
      }
      return newData
    })
  }

  // 添加语言
  const handleAddLanguage = (langCode) => {
    // 确保表单数据中有该语言的字段
    setFormData(prev => ({
      ...prev,
      displayName: {
        ...prev.displayName,
        [langCode]: ''
      },
      description: {
        ...prev.description,
        [langCode]: ''
      }
    }))
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

  // 获取标签的现有语言
  const getExistingLanguages = (tag) => {
    const languages = new Set()

    if (tag.display_name) {
      let displayName = {}
      if (typeof tag.display_name === 'string') {
        try {
          displayName = JSON.parse(tag.display_name)
        } catch {
          displayName = { zh: tag.display_name }
        }
      } else if (typeof tag.display_name === 'object') {
        displayName = tag.display_name || {}
      }

      Object.keys(displayName).forEach(lang => {
        if (displayName[lang] && displayName[lang].trim()) {
          languages.add(lang)
        }
      })
    }

    // 如果没有找到任何语言，默认返回中文
    return Array.from(languages).length > 0 ? Array.from(languages) : ['zh']
  }

  // 开始编辑
  const startEdit = (tag) => {
    // 数据库字段名是 display_name 和 description
    let displayName = {}
    let description = {}

    // 处理 display_name 字段
    if (typeof tag.display_name === 'string') {
      try {
        displayName = JSON.parse(tag.display_name)
      } catch {
        displayName = { zh: tag.display_name }
      }
    } else if (typeof tag.display_name === 'object') {
      displayName = tag.display_name || {}
    }

    // 处理 description 字段
    if (typeof tag.description === 'string') {
      try {
        description = JSON.parse(tag.description)
      } catch {
        description = { zh: tag.description }
      }
    } else if (typeof tag.description === 'object') {
      description = tag.description || {}
    }

    setFormData({
      displayName: displayName || { zh: '' },
      description: description || { zh: '' }
    })
    setEditingId(tag.tag_id)
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

    // 验证必填字段
    if (!formData.displayName.zh?.trim()) {
      setError('请输入中文名称')
      return
    }

    setLoading(true)
    setError('')

    try {
      const requestData = {
        display_name: formData.displayName,
        description: formData.description
      }

      let response
      if (editingId) {
        // 更新
        response = await apiFetch(`/api/tags/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(requestData)
        })
      } else {
        // 新增
        response = await apiFetch('/api/tags', {
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(editingId ? '标签更新成功！' : '标签创建成功！')
        resetForm()
        loadTags() // 重新加载列表

        // 触发标签更新事件，通知主应用刷新saveOptions
        eventBus.emit('tagUpdated', { action: editingId ? 'update' : 'create', id: editingId || data.data?.id })
      } else {
        setError(data.message || '操作失败')
      }
    } catch (err) {
      setError('网络错误：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 删除标签
  const handleDelete = async (tagId, displayName) => {
    if (!(await confirm(`确定要删除标签 "${displayName}" 吗？`, {
      title: '删除标签',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    }))) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(`/api/tags/${tagId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('标签删除成功！')
        loadTags() // 重新加载列表

        // 触发标签更新事件，通知主应用刷新saveOptions
        eventBus.emit('tagUpdated', { action: 'delete', id: tagId })
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
    if (selectedItems.size === tags.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(tags.map(tag => tag.tag_id)))
    }
  }

  // 切换单个选择
  const toggleSelectItem = (tagId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId)
    } else {
      newSelected.add(tagId)
    }
    setSelectedItems(newSelected)
  }

  // 获取基础语言内容（优先英文，后中文）
  const getBaseLanguageContent = (multiLangData) => {
    if (!multiLangData) return { lang: 'zh', content: '' }

    let parsedData = {}
    if (typeof multiLangData === 'string') {
      try {
        parsedData = JSON.parse(multiLangData)
      } catch {
        return { lang: 'zh', content: multiLangData }
      }
    } else if (typeof multiLangData === 'object') {
      parsedData = multiLangData || {}
    }

    // 优先检查英文，然后中文
    if (parsedData.en && parsedData.en.trim()) {
      return { lang: 'en', content: parsedData.en }
    } else if (parsedData.zh && parsedData.zh.trim()) {
      return { lang: 'zh', content: parsedData.zh }
    } else {
      // 如果都没有，取第一个有内容的语言
      for (const [lang, content] of Object.entries(parsedData)) {
        if (content && content.trim()) {
          return { lang, content }
        }
      }
    }

    return { lang: 'zh', content: '' }
  }

  // 执行国际化
  const handleInternationalization = async () => {
    if (selectedItems.size === 0) {
      setError('请先选择要国际化的标签')
      return
    }

    if (selectedLanguages.length === 0) {
      setError('请选择要翻译的语言')
      return
    }

    setInternationalizationLoading(true)
    setError('')

    try {
      const selectedTags = tags.filter(tag => selectedItems.has(tag.tag_id))

      const requestData = {
        type: 'tags',
        items: selectedTags.map(tag => {
          const nameBase = getBaseLanguageContent(tag.display_name)
          const descBase = getBaseLanguageContent(tag.description)

          return {
            id: tag.tag_id,
            name: nameBase.content,
            description: descBase.content,
            baseLanguage: nameBase.lang === 'en' || descBase.lang === 'en' ? 'en' : 'zh' // 如果任一字段有英文就用英文作为基础语言
          }
        }),
        targetLanguages: selectedLanguages
      }

      const response = await apiFetch('/api/internationalization', {
        method: 'POST',
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (data.success) {
        console.log('国际化翻译结果:', data.results)
        setInternationalizationResults(data.results)

        // 自动设置第一个语言为活跃语言
        if (selectedLanguages.length > 0) {
          setActiveInternationalizationLanguage(selectedLanguages[0])
        }

        setSuccess(`成功为 ${selectedItems.size} 个标签生成了 ${selectedLanguages.length} 种语言的翻译`)
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

  // 双语显示名称（中文+英文）
  const formatDisplayNameBilingual = (display_name) => {
    if (!display_name) return '未命名'

    let parsedData = {}
    if (typeof display_name === 'string') {
      try {
        parsedData = JSON.parse(display_name)
      } catch {
        return display_name
      }
    } else if (typeof display_name === 'object') {
      parsedData = display_name || {}
    } else {
      return '未命名'
    }

    const zh = parsedData.zh?.trim()
    const en = parsedData.en?.trim()

    if (zh && en) {
      return (
        <div className="space-y-1">
          <div className="font-medium">{zh}</div>
          <div className="text-sm text-gray-500">{en}</div>
        </div>
      )
    } else if (zh) {
      return <div className="font-medium">{zh}</div>
    } else if (en) {
      return <div className="font-medium">{en}</div>
    } else {
      return <div className="font-medium text-gray-400">未命名</div>
    }
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
      const response = await apiFetch('/api/internationalization/save', {
        method: 'POST',
        body: JSON.stringify({
          type: 'tags',
          translations: internationalizationResults
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`翻译保存成功！保存了 ${data.savedCount} 个标签的翻译`)
        setInternationalizationResults({})
        setSelectedItems(new Set())
        setSelectedLanguages([])
        setActiveInternationalizationLanguage('') // 清除活跃语言
        // 重新加载数据以显示最新的翻译
        loadTags()
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

  const handleTranslationEdit = (tagId, langCode, field, value) => {
    setInternationalizationResults(prev => ({
      ...prev,
      [tagId]: {
        ...prev[tagId],
        [langCode]: {
          ...prev[tagId][langCode],
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">标签管理</h1>
          <div className="flex gap-2">
            <Button
              onClick={loadTags}
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
              新增标签
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
                  {Object.entries(internationalizationResults).map(([tagId, translations]) => {
                    const tag = tags.find(t => t.tag_id.toString() === tagId)
                    const translation = translations[activeInternationalizationLanguage]

                    if (!tag || !translation) return null

                    return (
                      <div key={tagId} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <h3 className="font-medium text-gray-900">
                            {formatDisplayNameBilingual(tag.display_name)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            原始内容 → {supportedLanguages.find(lang => lang.code === activeInternationalizationLanguage)?.name || activeInternationalizationLanguage}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* 标签名称 */}
                          {translation.name !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">标签名称</Label>
                              <Input
                                value={translation.name || ''}
                                onChange={(e) => handleTranslationEdit(tagId, activeInternationalizationLanguage, 'name', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译名称"
                              />
                            </div>
                          )}

                          {/* 标签描述 */}
                          {translation.description !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">标签描述</Label>
                              <Textarea
                                value={translation.description || ''}
                                onChange={(e) => handleTranslationEdit(tagId, activeInternationalizationLanguage, 'description', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
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
              )}
            </CardContent>
          </Card>
        )}

        {/* 新增/编辑表单 */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? '编辑标签' : '新增标签'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 根据现有语言显示多语言输入框 */}
                {(() => {
                  const languages = editingId
                    ? Object.keys(formData.displayName || {}).length > 0
                      ? Object.keys(formData.displayName)
                      : getExistingLanguages(tags.find(tag => tag.tag_id === editingId))
                    : ['zh']

                  return (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">名称</h3>
                          {/* 添加语言按钮 - 仅在编辑时显示 */}
                          {editingId && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">添加语言：</span>
                              <div className="flex flex-wrap gap-1">
                                {supportedLanguages
                                  .filter(lang => !languages.includes(lang.code))
                                  .map(lang => (
                                    <button
                                      key={lang.code}
                                      type="button"
                                      onClick={() => handleAddLanguage(lang.code)}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                    >
                                      + {lang.name}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {languages.map(langCode => {
                            const language = supportedLanguages.find(l => l.code === langCode) || { name: langCode === 'zh' ? '中文' : langCode }
                            const canDelete = editingId && languages.length > 1 && langCode !== 'zh'

                            return (
                              <div key={langCode} className="relative">
                                <Label htmlFor={`displayName_${langCode}`}>
                                  {language.name} {langCode === 'zh' && '*'}
                                </Label>
                                {/* 删除语言按钮 */}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLanguage(langCode)}
                                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center"
                                    title={`删除${language.name}语言`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
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
                            const canDelete = editingId && languages.length > 1 && langCode !== 'zh'

                            return (
                              <div key={langCode} className="relative">
                                <Label htmlFor={`description_${langCode}`}>
                                  {language.name}描述
                                </Label>
                                {/* 删除语言按钮 */}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLanguage(langCode)}
                                    className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center"
                                    title={`删除${language.name}语言`}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
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

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? '保存中...' : (editingId ? '更新标签' : '创建标签')}
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

        {/* 标签列表 */}
        <Card>
          <CardHeader>
            <div className="space-y-3">
              {/* 第一行：标题和全选按钮 */}
              <div className="flex items-center justify-between">
                <CardTitle>标签列表 ({tags.length})</CardTitle>
                {tags.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2"
                  >
                    {selectedItems.size === tags.length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {selectedItems.size === tags.length ? '取消全选' : '全选'}
                  </Button>
                )}
              </div>

              {/* 第二行：国际化操作栏（仅在有选中项目时显示）*/}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Languages className="w-4 h-4" />
                    <span className="font-medium">
                      已选择 {selectedItems.size} 个标签
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
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
            {loading && tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : tags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暂无标签数据
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
                          {selectedItems.size === tags.length ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </th>
                      <th className="border border-gray-200 px-4 py-2 text-left">名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">描述</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">语言</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                      <th className="border border-gray-200 px-4 py-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag) => {
                      const existingLanguages = getExistingLanguages(tag)
                      return (
                        <tr key={tag.tag_id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSelectItem(tag.tag_id)}
                              className="p-0 h-auto"
                            >
                              {selectedItems.has(tag.tag_id) ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </Button>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="font-medium">
                              {formatDisplayNameBilingual(tag.display_name)}
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 max-w-xs">
                            <div className="truncate" title={formatDescription(tag.description)}>
                              {formatDescription(tag.description) || '暂无描述'}
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
                          <td className="border border-gray-200 px-4 py-2 text-sm text-gray-500">
                            {tag.created_at ? new Date(tag.created_at).toLocaleString('zh-CN') : '未知'}
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(tag)}
                                className="flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(tag.tag_id, formatDisplayName(tag.display_name))}
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
    </div>
  )
}

export default TagsManager 