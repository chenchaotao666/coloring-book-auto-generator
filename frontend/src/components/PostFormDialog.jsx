import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RefreshCw, Save, X, Languages } from 'lucide-react'

const PostFormDialog = React.memo(({ 
  show, 
  onClose, 
  title, 
  onSubmit, 
  formData, 
  handleInputChange, 
  generateSlug, 
  baseLanguage, 
  loading, 
  editingPost 
}) => {
  // 活跃的编辑语言
  const [activeFormLanguage, setActiveFormLanguage] = useState(baseLanguage)

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
    { code: 'ru', name: '俄语' }
  ]

  // 获取现有的语言列表
  const getExistingLanguages = () => {
    const languages = new Set()
    
    // 从各个多语言字段中收集存在的语言（包括空内容的键）
    const fields = ['title', 'excerpt', 'content', 'meta_title', 'meta_description']
    fields.forEach(field => {
      if (formData[field] && typeof formData[field] === 'object') {
        Object.keys(formData[field]).forEach(lang => {
          // 只要存在这个语言的键就添加，不管内容是否为空
          languages.add(lang)
        })
      }
    })

    // 确保至少包含基础语言
    languages.add(baseLanguage)
    
    return Array.from(languages)
  }

  const languages = getExistingLanguages()

  // 当显示对话框时，重置活跃语言为基础语言
  useEffect(() => {
    if (show) {
      setActiveFormLanguage(baseLanguage)
    }
  }, [show, baseLanguage])

  // 获取当前语言信息
  const currentLanguage = supportedLanguages.find(lang => lang.code === activeFormLanguage) || supportedLanguages[0]

  // 切换语言并确保formData中有对应的键
  const switchLanguage = (langCode) => {
    console.log(`切换到语言: ${langCode}`)
    console.log('当前formData:', formData)
    
    // 首先确保所有多语言字段都有这个语言的键
    const fields = ['title', 'excerpt', 'content', 'meta_title', 'meta_description']
    fields.forEach(field => {
      if (formData[field] && typeof formData[field] === 'object') {
        if (!(langCode in formData[field])) {
          console.log(`为字段 ${field} 初始化语言 ${langCode}`)
          handleInputChange(field, '', langCode) // 初始化为空字符串
        }
      }
    })
    
    // 然后切换活跃语言
    setActiveFormLanguage(langCode)
  }

  return (
  <Dialog isOpen={show} onClose={onClose}>
    <DialogContent className="max-w-6xl h-[85vh] w-[85vw] flex flex-col overflow-hidden">
        {/* 头部 - 固定 */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 滚动内容区域 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4">
          {/* 语言选择器 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 border-b mb-4">
              {languages.map(langCode => {
                const language = supportedLanguages.find(lang => lang.code === langCode)
                const isActive = activeFormLanguage === langCode
                const isRequired = langCode === baseLanguage

                return (
                  <div key={langCode} className="relative group">
                    <button
                      type="button"
                      onClick={() => switchLanguage(langCode)}
                      className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                        isActive
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {language?.name || langCode}
                        {isRequired && <span className="text-red-500">*</span>}
                      </div>
                    </button>
                  </div>
                )
              })}
              
              {/* 添加语言按钮 */}
              {show && supportedLanguages.filter(lang => !languages.includes(lang.code)).length > 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-600">添加语言:</span>
                  {supportedLanguages
                    .filter(lang => !languages.includes(lang.code))
                    .slice(0, 3)
                    .map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => switchLanguage(lang.code)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        + {lang.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-full">
          {/* 标题 */}
          <div className="md:col-span-2">
            <Label>标题 {activeFormLanguage === baseLanguage && <span className="text-red-500">*</span>}</Label>
            <Input
              placeholder={`请输入${currentLanguage.name}标题`}
              value={formData.title[activeFormLanguage] || ''}
              onChange={(e) => {
                handleInputChange('title', e.target.value, activeFormLanguage)
                // 自动生成slug（仅基础语言）
                if (activeFormLanguage === baseLanguage && !formData.slug) {
                  handleInputChange('slug', generateSlug(e.target.value))
                }
              }}
              className="w-full"
            />
          </div>

          {/* Slug */}
          <div>
            <Label>URL Slug</Label>
            <Input
              placeholder="url-friendly-slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              className="w-full"
            />
          </div>

          {/* 作者 */}
          <div>
            <Label>作者 <span className="text-red-500">*</span></Label>
            <Input
              placeholder="作者姓名"
              value={formData.author}
              onChange={(e) => handleInputChange('author', e.target.value)}
              className="w-full"
              required
            />
          </div>

          {/* 状态 */}
          <div>
            <Label>状态</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="published">已发布</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 特色图片 */}
          <div>
            <Label>特色图片URL</Label>
            <Input
              placeholder="https://example.com/image.jpg"
              value={formData.featured_image}
              onChange={(e) => handleInputChange('featured_image', e.target.value)}
              className="w-full"
            />
          </div>

          {/* SEO 元标题 */}
          <div>
            <Label>SEO 元标题</Label>
            <Input
              placeholder={`请输入${currentLanguage.name} SEO标题`}
              value={formData.meta_title[activeFormLanguage] || ''}
              onChange={(e) => handleInputChange('meta_title', e.target.value, activeFormLanguage)}
              className="w-full"
            />
          </div>

          {/* SEO 元描述 */}
          <div>
            <Label>SEO 元描述</Label>
            <Textarea
              placeholder={`请输入${currentLanguage.name} SEO描述`}
              value={formData.meta_description[activeFormLanguage] || ''}
              onChange={(e) => handleInputChange('meta_description', e.target.value, activeFormLanguage)}
              rows={2}
              className="w-full"
            />
          </div>

          {/* 摘要 */}
          <div className="md:col-span-2">
            <Label>摘要</Label>
            <Textarea
              placeholder={`请输入${currentLanguage.name}摘要`}
              value={formData.excerpt[activeFormLanguage] || ''}
              onChange={(e) => handleInputChange('excerpt', e.target.value, activeFormLanguage)}
              rows={3}
              className="w-full"
            />
          </div>

          {/* 内容 */}
          <div className="md:col-span-2">
            <Label>内容 {activeFormLanguage === baseLanguage && <span className="text-red-500">*</span>}</Label>
            <RichTextEditor
              key={`content-${activeFormLanguage}`}
              placeholder={`请输入${currentLanguage.name}内容`}
              value={formData.content[activeFormLanguage] || ''}
              onChange={(value) => {
                console.log(`富文本内容变化 - 语言: ${activeFormLanguage}, 内容: ${value?.substring(0, 50)}...`)
                handleInputChange('content', value, activeFormLanguage)
              }}
            />
          </div>
          </div>
        </div>

        {/* 底部按钮 - 固定 */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {editingPost ? '更新' : '创建'}
          </Button>
        </div>
    </DialogContent>
  </Dialog>
  )
})

PostFormDialog.displayName = 'PostFormDialog'

export default PostFormDialog