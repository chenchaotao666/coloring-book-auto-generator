import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Languages, Palette, Save } from 'lucide-react'
import React from 'react'

const ImageForm = ({
  formData,
  editingLanguages,
  supportedLanguages,
  categories,
  tags,
  typeOptions,
  ratioOptions,
  loading,
  onInputChange,
  onAddLanguage,
  onRemoveLanguage,
  onSubmit,
  onCancel,
  formatMultiLangField,
  showButtons = true,
  className = '',
  readOnly = false,
  onGenerateColoring = null,
  isGeneratingColoring = false
}) => {
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(e)
  }

  const handleGenerateColoring = () => {
    if (onGenerateColoring) {
      onGenerateColoring(formData)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* 基础信息 - 三列布局 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">基础信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>类型</Label>
            <Select value={formData.type} onValueChange={readOnly ? undefined : (value) => onInputChange('type', null, value)} disabled={readOnly}>
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
            <Select value={formData.ratio} onValueChange={readOnly ? undefined : (value) => onInputChange('ratio', null, value)} disabled={readOnly}>
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
          <div>
            <Label>分类</Label>
            <Select value={formData.categoryId ? formData.categoryId.toString() : 'none'} onValueChange={readOnly ? undefined : (value) => onInputChange('categoryId', null, value === 'none' ? null : value)} disabled={readOnly}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无分类</SelectItem>
                {categories.map(category => {
                  const categoryId = category.category_id || category.id
                  const displayName = category.display_name || category.name
                  return (
                    <SelectItem key={categoryId} value={categoryId.toString()}>
                      {formatMultiLangField(displayName)}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>标签</Label>
            <MultiSelect
              options={(tags || []).map(tag => {
                const tagId = tag.tag_id || tag.id
                const displayName = tag.display_name || tag.name
                return {
                  value: tagId.toString(),
                  label: formatMultiLangField(displayName)
                }
              })}
              value={(formData.tagIds || []).map(id => id.toString())}
              onChange={readOnly ? undefined : (values) => onInputChange('tagIds', null, values || [])}
              placeholder="选择标签"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>尺寸</Label>
            <Input
              value={formData.size}
              onChange={readOnly ? undefined : (e) => onInputChange('size', null, e.target.value)}
              placeholder="如：512,512"
              readOnly={readOnly}
            />
          </div>
          <div>
            <Label>热度值</Label>
            <Input
              type="number"
              min="0"
              max="1000"
              value={formData.hotness || 0}
              onChange={readOnly ? undefined : (e) => onInputChange('hotness', null, parseInt(e.target.value) || 0)}
              placeholder="0-1000"
              readOnly={readOnly}
            />
            <p className="text-xs text-gray-500 mt-1">热度值范围：0-1000</p>
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={readOnly ? undefined : (e) => onInputChange('isPublic', null, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={readOnly}
            />
            <Label htmlFor="isPublic" className="text-sm font-medium text-gray-700">
              公开图片
            </Label>
          </div>
        </div>
      </div>

      {/* 图片URL - 三列布局并显示预览 */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">图片地址</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>默认图片URL</Label>
            <Input
              value={formData.defaultUrl}
              onChange={readOnly ? undefined : (e) => onInputChange('defaultUrl', null, e.target.value)}
              placeholder="黑白涂色图URL"
              readOnly={readOnly}
            />
            {formData.defaultUrl && (
              <div className="mt-2">
                <img
                  src={formData.defaultUrl}
                  alt="默认图片预览"
                  className="w-full h-40 object-contain rounded border bg-gray-50"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="hidden w-full h-40 items-center justify-center text-xs text-gray-400 bg-gray-100 rounded border">
                  图片加载失败
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>彩色图片URL</Label>
            <Input
              value={formData.colorUrl}
              onChange={readOnly ? undefined : (e) => onInputChange('colorUrl', null, e.target.value)}
              placeholder="用户上传的彩色图URL"
              readOnly={readOnly}
            />
            {formData.colorUrl && (
              <div className="mt-2">
                <img
                  src={formData.colorUrl}
                  alt="彩色图片预览"
                  className="w-full h-40 object-contain rounded border bg-gray-50"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="hidden w-full h-40 items-center justify-center text-xs text-gray-400 bg-gray-100 rounded border">
                  图片加载失败
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>上色后图片URL</Label>
              {onGenerateColoring && formData.defaultUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateColoring}
                  disabled={isGeneratingColoring}
                  className="flex items-center gap-1"
                >
                  <Palette className="w-3 h-3" />
                  {isGeneratingColoring ? '生成中...' : '生成上色图片'}
                </Button>
              )}
            </div>
            <Input
              value={formData.coloringUrl}
              onChange={readOnly ? undefined : (e) => onInputChange('coloringUrl', null, e.target.value)}
              placeholder="AI上色后的图片URL"
              readOnly={readOnly}
            />
            {formData.coloringUrl && (
              <div className="mt-2">
                <img
                  src={formData.coloringUrl}
                  alt="上色结果预览"
                  className="w-full h-40 object-contain rounded border bg-gray-50"
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="hidden w-full h-40 items-center justify-center text-xs text-gray-400 bg-gray-100 rounded border">
                  图片加载失败
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 多语言内容编辑 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">多语言内容</h3>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Select onValueChange={onAddLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="添加语言" />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages
                    .filter(lang => !editingLanguages.includes(lang.code))
                    .map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* 语言选项卡 */}
        <div className="flex flex-wrap gap-2 border-b">
          {editingLanguages.map(langCode => (
            <div key={langCode} className="flex items-center gap-1">
              <button
                type="button"
                className="px-3 py-1 text-sm rounded-t-lg border-b-2 border-blue-500 bg-blue-50 text-blue-700"
              >
                {supportedLanguages.find(l => l.code === langCode)?.name || langCode.toUpperCase()}
              </button>
              {!readOnly && langCode !== 'zh' && (
                <button
                  type="button"
                  onClick={() => onRemoveLanguage(langCode)}
                  className="text-red-500 hover:text-red-700"
                  title="移除此语言"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 两列内容编辑 */}
        {editingLanguages.map(langCode => (
          <div key={langCode} className="p-4 border rounded-lg bg-gray-50">
            <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-4">
              <Languages className="w-4 h-4" />
              {supportedLanguages.find(l => l.code === langCode)?.name || langCode.toUpperCase()}
              {langCode === 'zh' && <span className="text-red-500">*</span>}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 左侧：名称、标题、描述、AI提示词 */}
              <div className="space-y-4">
                <div>
                  <Label>名称{langCode === 'zh' ? '*' : ''}</Label>
                  <Input
                    value={(formData.name && formData.name[langCode]) || ''}
                    onChange={readOnly ? undefined : (e) => onInputChange('name', langCode, e.target.value)}
                    placeholder={`输入${supportedLanguages.find(l => l.code === langCode)?.name || langCode}名称`}
                    required={langCode === 'zh'}
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <Label>标题{langCode === 'zh' ? '*' : ''}</Label>
                  <Input
                    value={(formData.title && formData.title[langCode]) || ''}
                    onChange={readOnly ? undefined : (e) => onInputChange('title', langCode, e.target.value)}
                    placeholder={`输入${supportedLanguages.find(l => l.code === langCode)?.name || langCode}标题`}
                    required={langCode === 'zh'}
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <Label>描述</Label>
                  <Textarea
                    value={(formData.description && formData.description[langCode]) || ''}
                    onChange={readOnly ? undefined : (e) => onInputChange('description', langCode, e.target.value)}
                    placeholder={`输入${supportedLanguages.find(l => l.code === langCode)?.name || langCode}描述`}
                    rows={2}
                    readOnly={readOnly}
                  />
                </div>
                <div>
                  <Label>AI提示词</Label>
                  <Textarea
                    value={(formData.prompt && formData.prompt[langCode]) || ''}
                    onChange={readOnly ? undefined : (e) => onInputChange('prompt', langCode, e.target.value)}
                    placeholder={`输入${supportedLanguages.find(l => l.code === langCode)?.name || langCode}AI提示词`}
                    rows={3}
                    readOnly={readOnly}
                  />
                </div>
              </div>

              {/* 右侧：文案内容（高度更高） */}
              <div>
                <Label>文案内容</Label>
                <Textarea
                  value={(formData.additionalInfo && formData.additionalInfo[langCode]) || ''}
                  onChange={readOnly ? undefined : (e) => onInputChange('additionalInfo', langCode, e.target.value)}
                  placeholder={`输入${supportedLanguages.find(l => l.code === langCode)?.name || langCode}文案内容`}
                  rows={17}
                  readOnly={readOnly}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 表单按钮 */}
      {showButtons && !readOnly && (
        <div className="flex gap-2 pt-6 border-t mt-6">
          <Button type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? '保存中...' : '保存'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>
      )}
    </form>
  )
}

export default ImageForm 