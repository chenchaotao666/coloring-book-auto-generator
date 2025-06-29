import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Image as ImageIcon, Languages, Palette, Save, Upload } from 'lucide-react'
import React, { useState } from 'react'

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
  isGeneratingColoring = false,
  coloringTaskStatus = null,
  onTextToImage = null,
  isGeneratingTextToImage = false,
  textToImageTaskStatus = null,
  onImageToImage = null,
  isGeneratingImageToImage = false,
  imageToImageTaskStatus = null
}) => {
  const [uploadedImageFile, setUploadedImageFile] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(e)
  }

  const handleGenerateColoring = () => {
    if (onGenerateColoring) {
      onGenerateColoring(formData)
    }
  }

  const handleTextToImage = () => {
    if (onTextToImage) {
      onTextToImage(formData)
    }
  }

  const handleImageToImage = () => {
    if (onImageToImage && uploadedImageFile) {
      onImageToImage(formData, uploadedImageFile)
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedImageFile(file)

      // 立即创建预览URL并更新到彩色图片URL
      const previewUrl = URL.createObjectURL(file)
      console.log('用户上传图片，创建预览URL:', previewUrl)

      // 立即更新彩色图片URL为预览URL
      if (onInputChange) {
        onInputChange('colorUrl', null, previewUrl)
        console.log('已更新彩色图片URL为预览URL')
      }
    }
  }

  const removeUploadedImage = () => {
    // 如果当前彩色图片URL是blob预览URL，需要释放它
    if (formData.colorUrl && formData.colorUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.colorUrl)
      console.log('已释放预览URL:', formData.colorUrl)
    }

    setUploadedImageFile(null)

    // 清空彩色图片URL
    if (onInputChange) {
      onInputChange('colorUrl', null, '')
      console.log('已清空彩色图片URL')
    }

    // 清空文件输入
    const fileInput = document.getElementById('imageUpload')
    if (fileInput) {
      fileInput.value = ''
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
            <div className="flex items-center justify-between">
              <Label>黑白图片URL</Label>
              {onTextToImage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTextToImage}
                    disabled={isGeneratingTextToImage || readOnly}
                    className="flex items-center gap-1"
                  >
                    <ImageIcon className="w-3 h-3" />
                    {isGeneratingTextToImage ? '生成中...' : '文生图'}
                  </Button>
                  {textToImageTaskStatus && textToImageTaskStatus.status !== 'failed' && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${textToImageTaskStatus.progress || 0}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap">{textToImageTaskStatus.progress || 0}%</span>
                    </div>
                  )}
                  {textToImageTaskStatus && textToImageTaskStatus.status === 'failed' && (
                    <span className="text-xs text-red-500">生成失败</span>
                  )}
                </div>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <Label>彩色图片URL</Label>
              {onImageToImage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleImageToImage}
                    disabled={isGeneratingImageToImage || !uploadedImageFile || readOnly}
                    className="flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    {isGeneratingImageToImage ? '生成中...' : '图生图'}
                  </Button>
                  {imageToImageTaskStatus && imageToImageTaskStatus.status !== 'failed' && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${imageToImageTaskStatus.progress || 0}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap">{imageToImageTaskStatus.progress || 0}%</span>
                    </div>
                  )}
                  {imageToImageTaskStatus && imageToImageTaskStatus.status === 'failed' && (
                    <span className="text-xs text-red-500">生成失败</span>
                  )}
                </div>
              )}
            </div>
            <Input
              value={formData.colorUrl}
              onChange={readOnly ? undefined : (e) => onInputChange('colorUrl', null, e.target.value)}
              placeholder="用户上传的彩色图URL"
              readOnly={readOnly}
            />

            {/* 图片上传区域 */}
            {onImageToImage && !readOnly && (
              <div className="mt-2">
                <div className="text-sm font-medium text-gray-700 mb-2">上传参考图片</div>
                <div
                  className="w-full h-32 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative"
                  onClick={() => document.getElementById('imageUpload')?.click()}
                >
                  {uploadedImageFile ? (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(uploadedImageFile)}
                        alt="上传的图片"
                        className="max-w-full max-h-full object-contain rounded-lg"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeUploadedImage();
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-8 h-8 mb-2">
                        <Upload className="w-full h-full text-gray-400" />
                      </div>
                      <div className="text-gray-400 text-xs">点击上传图片</div>
                    </>
                  )}
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>上色后图片URL</Label>
              {onGenerateColoring && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateColoring}
                    disabled={isGeneratingColoring || !formData.defaultUrl || readOnly}
                    className="flex items-center gap-1"
                  >
                    <Palette className="w-3 h-3" />
                    {isGeneratingColoring ? '生成中...' : '生成上色图片'}
                  </Button>
                  {coloringTaskStatus && coloringTaskStatus.status !== 'failed' && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${coloringTaskStatus.progress || 0}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap">{coloringTaskStatus.progress || 0}%</span>
                    </div>
                  )}
                  {coloringTaskStatus && coloringTaskStatus.status === 'failed' && (
                    <span className="text-xs text-red-500">生成失败</span>
                  )}
                </div>
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