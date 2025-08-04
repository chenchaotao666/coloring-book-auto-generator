import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import PostFormDialog from '@/components/PostFormDialog'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/config/api'
import {
  AlertCircle,
  Check,
  CheckSquare,
  Edit3,
  FileText,
  Languages,
  Plus,
  RefreshCw,
  Save,
  Square,
  Trash2,
  X
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

const BlogManager = () => {
  // 确认对话框
  const confirm = useConfirm()

  // 状态管理
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedItems, setSelectedItems] = useState(new Set())
  const [showInternationalization, setShowInternationalization] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState([])
  const [internationalizationLoading, setInternationalizationLoading] = useState(false)
  const [internationalizationResults, setInternationalizationResults] = useState({})
  const [activeInternationalizationLanguage, setActiveInternationalizationLanguage] = useState('')

  // 编辑状态
  const [editingPost, setEditingPost] = useState(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  // 表单状态
  const [formData, setFormData] = useState({
    title: { en: '', zh: '' },
    slug: '',
    author: '',
    status: 'draft',
    featured_image: '',
    excerpt: { en: '', zh: '' },
    content: { en: '', zh: '' },
    meta_title: { en: '', zh: '' },
    meta_description: { en: '', zh: '' }
  })

  
  // 基础语言选择
  const [baseLanguage, setBaseLanguage] = useState('en') // 默认英文
  
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

  // 获取所有博客文章
  const fetchPosts = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch('/api/posts')
      const data = await response.json()
      if (data.success) {
        // 验证和清理数据
        const validatedPosts = (data.data || []).map(post => {
          // 确保多语言字段是正确的对象格式
          const validateField = (field) => {
            if (!field) return {}
            if (typeof field === 'string') {
              try {
                return JSON.parse(field)
              } catch {
                return { [baseLanguage]: field }
              }
            }
            if (typeof field === 'object') return field
            return {}
          }

          return {
            ...post,
            title: validateField(post.title),
            excerpt: validateField(post.excerpt),
            content: validateField(post.content),
            meta_title: validateField(post.meta_title),
            meta_description: validateField(post.meta_description),
          }
        })
        
        setPosts(validatedPosts)
      } else {
        setError(data.message || '获取博客文章失败')
      }
    } catch (err) {
      setError('获取博客文章失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 初始化
  useEffect(() => {
    fetchPosts()
  }, [])

  // 重置表单
  const resetForm = () => {
    const emptyMultiLang = {}
    emptyMultiLang[baseLanguage] = ''
    
    setFormData({
      title: { ...emptyMultiLang },
      slug: '',
      author: 'Admin', // 提供默认作者名
      status: 'draft',
      featured_image: '',
      excerpt: { ...emptyMultiLang },
      content: { ...emptyMultiLang },
      meta_title: { ...emptyMultiLang },
      meta_description: { ...emptyMultiLang }
    })
    setEditingPost(null)
  }

  // 处理表单输入变化 - 使用 useCallback 稳定化
  const handleInputChange = useCallback((field, value, lang = null) => {
    setFormData(prev => {
      if (lang) {
        return {
          ...prev,
          [field]: {
            ...prev[field],
            [lang]: value
          }
        }
      }
      return {
        ...prev,
        [field]: value
      }
    })
  }, [])

  // 自动生成slug - 使用 useCallback 稳定化
  const generateSlug = useCallback((title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }, [])


  // 创建博客文章
  const handleCreate = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 自动生成slug如果未提供
      if (!formData.slug && formData.title[baseLanguage]) {
        formData.slug = generateSlug(formData.title[baseLanguage])
      }

      // 验证必需字段
      const requiredFields = ['title', 'slug', 'author', 'content']
      const missingFields = []
      
      requiredFields.forEach(field => {
        if (field === 'title' || field === 'content') {
          // 多语言字段检查
          if (!formData[field] || typeof formData[field] !== 'object') {
            missingFields.push(`${field} (必须是对象格式)`)
          } else {
            // 检查是否至少有一个语言有内容
            const hasContent = Object.values(formData[field]).some(value => value && value.trim())
            if (!hasContent) {
              missingFields.push(`${field} (至少需要一个语言有内容)`)
            }
          }
        } else {
          // 普通字段检查
          if (!formData[field] || formData[field].trim() === '') {
            missingFields.push(field)
          }
        }
      })
      
      if (missingFields.length > 0) {
        setError(`请填写必需字段: ${missingFields.join(', ')}`)
        return
      }

      console.log('发送的博客数据:', formData)

      const response = await apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('博客文章创建成功')
        setShowCreateDialog(false)
        resetForm()
        fetchPosts()
      } else {
        setError(data.message || '创建博客文章失败')
      }
    } catch (err) {
      setError('创建博客文章失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 编辑博客文章
  const handleEdit = (post) => {
    setEditingPost(post)
    
    // 检测主要语言（有内容的第一个语言）
    const detectPrimaryLanguage = (multiLangField) => {
      if (!multiLangField || typeof multiLangField !== 'object') return baseLanguage
      const languages = Object.keys(multiLangField)
      return languages.find(lang => multiLangField[lang] && multiLangField[lang].trim()) || languages[0] || baseLanguage
    }
    
    const primaryLang = detectPrimaryLanguage(post.title) || detectPrimaryLanguage(post.content) || baseLanguage
    setBaseLanguage(primaryLang)
    
    setFormData({
      title: post.title || {},
      slug: post.slug || '',
      author: post.author || '',
      status: post.status || 'draft',
      featured_image: post.featured_image || '',
      excerpt: post.excerpt || {},
      content: post.content || {},
      meta_title: post.meta_title || {},
      meta_description: post.meta_description || {}
    })
    setShowEditDialog(true)
  }

  // 更新博客文章
  const handleUpdate = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await apiFetch(`/api/posts/${editingPost.post_id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('博客文章更新成功')
        setShowEditDialog(false)
        resetForm()
        fetchPosts()
      } else {
        setError(data.message || '更新博客文章失败')
      }
    } catch (err) {
      setError('更新博客文章失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 删除博客文章
  const handleDelete = async (postId) => {
    const confirmed = await confirm(
      '确认删除',
      '您确定要删除这篇博客文章吗？此操作无法撤销。'
    )

    if (!confirmed) return

    try {
      setLoading(true)
      setError('')

      const response = await apiFetch(`/api/posts/${postId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        setSuccess('博客文章删除成功')
        fetchPosts()
      } else {
        setError(data.message || '删除博客文章失败')
      }
    } catch (err) {
      setError('删除博客文章失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) {
      setError('请选择要删除的博客文章')
      return
    }

    const confirmed = await confirm(
      '确认批量删除',
      `您确定要删除选中的 ${selectedItems.size} 篇博客文章吗？此操作无法撤销。`
    )

    if (!confirmed) return

    try {
      setLoading(true)
      setError('')

      const deletePromises = Array.from(selectedItems).map(async postId => {
        const response = await apiFetch(`/api/posts/${postId}`, { method: 'DELETE' })
        return await response.json()
      })

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.success).length
      
      setSuccess(`成功删除 ${successCount} 篇博客文章`)
      setSelectedItems(new Set())
      fetchPosts()
    } catch (err) {
      setError('批量删除失败：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 选择/取消选择单个项目
  const toggleSelection = (postId) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(postId)) {
      newSelected.delete(postId)
    } else {
      newSelected.add(postId)
    }
    setSelectedItems(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedItems.size === posts.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(posts.map(post => post.post_id)))
    }
  }

  // 格式化日期
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 安全地获取多语言字段的显示文本
  const getDisplayText = (field, preferredLang = baseLanguage, fallback = '') => {
    if (!field) return fallback
    
    if (typeof field === 'string') return field
    
    if (typeof field === 'object' && field !== null) {
      // 优先使用指定语言
      if (field[preferredLang] && typeof field[preferredLang] === 'string') return field[preferredLang]
      // 备选语言
      if (field.en && typeof field.en === 'string') return field.en
      if (field.zh && typeof field.zh === 'string') return field.zh
      
      // 获取第一个非空字符串值
      const entries = Object.entries(field)
      for (const [key, value] of entries) {
        if (value && typeof value === 'string' && value.trim()) {
          return value
        }
      }
    }
    
    return fallback
  }

  // 执行国际化
  const handleInternationalization = async () => {
    if (selectedItems.size === 0) {
      setError('请先选择要国际化的博客文章')
      return
    }

    if (selectedLanguages.length === 0) {
      setError('请选择目标语言')
      return
    }

    try {
      setInternationalizationLoading(true)
      setError('')

      const selectedPosts = posts.filter(post => selectedItems.has(post.post_id))
      const results = {}

      for (const post of selectedPosts) {
        // 获取基础语言内容
        const getBaseContent = (field) => {
          return getDisplayText(field, baseLanguage, '')
        }

        const baseTitle = getBaseContent(post.title)
        const baseExcerpt = getBaseContent(post.excerpt)
        const baseContent = getBaseContent(post.content)

        if (!baseTitle || !baseContent) {
          continue // 跳过没有基础内容的文章
        }

        // 构建国际化请求
        const internationalizationData = {
          type: 'content',
          items: [{
            id: post.post_id,
            baseLanguage: baseLanguage,
            name: baseTitle, // AI期望的简短名称字段
            title: baseTitle, // AI期望的完整标题字段
            description: baseExcerpt, // AI期望的描述字段，对应excerpt
            prompt: '', // 博客没有AI提示词，传空字符串
            additionalInfo: baseContent // AI期望的文案内容字段，对应content
          }],
          targetLanguages: selectedLanguages
        }

        // 调用国际化API
        const response = await apiFetch('/api/internationalization', {
          method: 'POST',
          body: JSON.stringify(internationalizationData)
        })

        const data = await response.json()
        if (data.success) {
          console.log('国际化翻译结果:', data.results)
          // 将结果合并到results中，同时转换字段名
          Object.keys(data.results).forEach(itemId => {
            if (!results[itemId]) results[itemId] = {}
            
            // 转换AI返回的字段名为前端期望的字段名
            Object.keys(data.results[itemId]).forEach(langCode => {
              const translation = data.results[itemId][langCode]
              results[itemId][langCode] = {
                title: translation.title || translation.name || '', // AI的title或name字段 → 前端的title
                excerpt: translation.description || '', // AI的description字段 → 前端的excerpt
                content: translation.additionalInfo || '' // AI的additionalInfo字段 → 前端的content
              }
            })
          })
          
          console.log('转换后的翻译结果:', results)
        } else {
          console.error('国际化失败:', data)
          setError(data.message || '国际化失败')
        }
      }

      setInternationalizationResults(results)
      
      // 设置默认显示的语言
      if (selectedLanguages.length > 0) {
        setActiveInternationalizationLanguage(selectedLanguages[0])
      }

      setSuccess(`成功为 ${Object.keys(results).length} 篇文章生成国际化内容`)
    } catch (err) {
      setError('国际化失败：' + err.message)
    } finally {
      setInternationalizationLoading(false)
    }
  }

  // 保存翻译结果
  const handleSaveTranslations = async () => {
    if (Object.keys(internationalizationResults).length === 0) {
      setError('没有翻译结果需要保存')
      return
    }

    setLoading(true)
    setError('')

    try {
      // 转换前端字段名为后端期望的字段名
      const backendTranslations = {}
      Object.keys(internationalizationResults).forEach(itemId => {
        backendTranslations[itemId] = {}
        Object.keys(internationalizationResults[itemId]).forEach(langCode => {
          const translation = internationalizationResults[itemId][langCode]
          backendTranslations[itemId][langCode] = {
            title: translation.title || '', // 前端title → 后端title
            description: translation.excerpt || '', // 前端excerpt → 后端description
            additionalInfo: translation.content || '' // 前端content → 后端additionalInfo
          }
        })
      })
      
      console.log('发送给后端的翻译数据:', backendTranslations)
      
      const response = await apiFetch('/api/internationalization/save', {
        method: 'POST',
        body: JSON.stringify({
          type: 'content',
          translations: backendTranslations
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(`翻译保存成功！保存了 ${data.savedCount} 篇博客文章的翻译`)
        setInternationalizationResults({})
        setSelectedItems(new Set())
        setSelectedLanguages([])
        setActiveInternationalizationLanguage('')
        // 重新加载数据以显示最新的翻译
        fetchPosts()
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

  // 编辑翻译内容
  const handleTranslationEdit = (postId, langCode, field, value) => {
    setInternationalizationResults(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        [langCode]: {
          ...prev[postId][langCode],
          [field]: value
        }
      }
    }))
  }

  // 当国际化结果变化时，设置默认的活跃语言
  useEffect(() => {
    if (Object.keys(internationalizationResults).length > 0 && !activeInternationalizationLanguage) {
      const firstItemId = Object.keys(internationalizationResults)[0]
      const firstItemTranslations = internationalizationResults[firstItemId]
      if (firstItemTranslations && Object.keys(firstItemTranslations).length > 0) {
        setActiveInternationalizationLanguage(Object.keys(firstItemTranslations)[0])
      }
    }
  }, [internationalizationResults, activeInternationalizationLanguage])

  // 清除消息
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('')
        setSuccess('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])


  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">博客管理</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建博客
          </Button>
          <Button variant="outline" onClick={fetchPosts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="baseLanguage" className="text-sm font-medium whitespace-nowrap">基础语言:</Label>
            <Select value={baseLanguage} onValueChange={setBaseLanguage}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="en">英文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 消息提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
          <Check className="w-4 h-4 mr-2" />
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
                    setActiveInternationalizationLanguage('')
                  }}
                >
                  清除结果
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 语言标签页 */}
              <div className="flex flex-wrap gap-2 border-b">
                {(() => {
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
                  {Object.entries(internationalizationResults).map(([postId, translations]) => {
                    const post = posts.find(p => p.post_id === postId)
                    const translation = translations[activeInternationalizationLanguage]

                    if (!post || !translation) return null

                    return (
                      <div key={postId} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <h3 className="font-medium text-gray-900">
                            {getDisplayText(post.title, baseLanguage, '未知标题')}
                          </h3>
                          <p className="text-sm text-gray-500">
                            原始内容 → {supportedLanguages.find(lang => lang.code === activeInternationalizationLanguage)?.name || activeInternationalizationLanguage}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* 标题 */}
                          {translation.title !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">标题</Label>
                              <Input
                                value={translation.title || ''}
                                onChange={(e) => handleTranslationEdit(postId, activeInternationalizationLanguage, 'title', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译标题"
                              />
                            </div>
                          )}

                          {/* 摘要 */}
                          {translation.excerpt !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">摘要</Label>
                              <Textarea
                                value={translation.excerpt || ''}
                                onChange={(e) => handleTranslationEdit(postId, activeInternationalizationLanguage, 'excerpt', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译摘要"
                                rows={2}
                              />
                            </div>
                          )}

                          {/* 内容 */}
                          {translation.content !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">内容</Label>
                              <div className="mt-1">
                                <RichTextEditor
                                  value={translation.content || ''}
                                  onChange={(value) => handleTranslationEdit(postId, activeInternationalizationLanguage, 'content', value)}
                                  placeholder="翻译内容"
                                  className="text-sm bg-gray-50"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 博客列表 */}
      <Card>
        <CardHeader>
          <div className="space-y-3">
            {/* 第一行：标题和全选按钮 */}
            <div className="flex items-center justify-between">
              <CardTitle>博客文章列表 ({posts.length})</CardTitle>
              {posts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2"
                >
                  {selectedItems.size === posts.length ? (
                    <CheckSquare className="w-4 h-4" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedItems.size === posts.length ? '取消全选' : '全选'}
                </Button>
              )}
            </div>

            {/* 第二行：国际化操作栏（仅在有选中项目时显示）*/}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700">
                  <Languages className="w-4 h-4" />
                  <span className="font-medium">
                    已选择 {selectedItems.size} 篇博客文章
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
                      setActiveInternationalizationLanguage('')
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    取消选择
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && posts.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>加载中...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">暂无博客文章</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.post_id}
                  className={`border rounded-lg p-4 ${
                    selectedItems.has(post.post_id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        onClick={() => toggleSelection(post.post_id)}
                        className="mt-1"
                      >
                        {selectedItems.has(post.post_id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {getDisplayText(post.title, baseLanguage, '无标题')}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            post.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {post.status === 'published' ? '已发布' : '草稿'}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-2">
                          {getDisplayText(post.excerpt, baseLanguage, '暂无摘要')}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>作者: {post.author}</span>
                          <span>发布时间: {formatDate(post.published_date)}</span>
                          <span>创建时间: {formatDate(post.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(post)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(post.post_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 创建对话框 */}
      <PostFormDialog
        show={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          resetForm()
        }}
        title="创建博客文章"
        onSubmit={handleCreate}
        formData={formData}
        handleInputChange={handleInputChange}
        generateSlug={generateSlug}
        baseLanguage={baseLanguage}
        loading={loading}
        editingPost={editingPost}
      />

      {/* 编辑对话框 */}
      <PostFormDialog
        show={showEditDialog}
        onClose={() => {
          setShowEditDialog(false)
          resetForm()
        }}
        title="编辑博客文章"
        onSubmit={handleUpdate}
        formData={formData}
        handleInputChange={handleInputChange}
        generateSlug={generateSlug}
        baseLanguage={baseLanguage}
        loading={loading}
        editingPost={editingPost}
      />
    </div>
  )
}

export default BlogManager