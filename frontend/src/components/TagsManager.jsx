import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
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

  // 表单状态
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    displayName: { zh: '' },
    description: { zh: '' }
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

  // 加载标签列表
  const loadTags = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/tags')
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
    const languages = new Set(['zh']) // 中文是必须的

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

    return Array.from(languages)
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
        response = await fetch(`/api/tags/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
      } else {
        // 新增
        response = await fetch('/api/tags', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(editingId ? '标签更新成功！' : '标签创建成功！')
        resetForm()
        loadTags() // 重新加载列表
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
    if (!window.confirm(`确定要删除标签 "${displayName}" 吗？`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('标签删除成功！')
        loadTags() // 重新加载列表
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
        items: selectedTags.map(tag => ({
          id: tag.tag_id,
          name: formatDisplayName(tag.display_name),
          description: formatDescription(tag.description)
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
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

        {/* 国际化操作栏 */}
        {selectedItems.size > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Languages className="w-4 h-4" />
              <span className="font-medium">已选择 {selectedItems.size} 个标签</span>
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
              {Object.entries(internationalizationResults).map(([tagId, translations]) => {
                const tag = tags.find(t => t.tag_id.toString() === tagId)
                if (!tag) return null

                return (
                  <div key={tagId} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">
                      {formatDisplayName(tag.display_name)} (ID: {tagId})
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
                                  onChange={(e) => handleTranslationEdit(tagId, langCode, 'name', e.target.value)}
                                  className="mt-1 text-sm"
                                  placeholder="翻译名称"
                                />
                              </div>
                              {(content.description !== undefined) && (
                                <div>
                                  <Label className="text-xs text-gray-500">描述</Label>
                                  <Textarea
                                    value={content.description || ''}
                                    onChange={(e) => handleTranslationEdit(tagId, langCode, 'description', e.target.value)}
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
            <CardTitle>{editingId ? '编辑标签' : '新增标签'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 根据现有语言显示多语言输入框 */}
              {(() => {
                const languages = editingId
                  ? getExistingLanguages(tags.find(tag => tag.tag_id === editingId))
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
                    <th className="border border-gray-200 px-4 py-2 text-left">ID</th>
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
                          {tag.tag_id}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="font-medium">
                            {formatDisplayName(tag.display_name)}
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
  )
}

export default TagsManager 