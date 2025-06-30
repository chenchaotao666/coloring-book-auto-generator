import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Languages, RefreshCw } from 'lucide-react'
import React from 'react'

const InternationalizationEditor = ({
  translation,
  onTranslationEdit,
  imageId,
  languageCode,
  originalImage,
  supportedLanguages,
  readOnly = false,
  getDisplayText = (text) => text || '',
  onGenerateTranslation = null,
  isGeneratingTranslation = false
}) => {
  // 获取语言显示名称
  const languageName = supportedLanguages.find(l => l.code === languageCode)?.name || languageCode.toUpperCase()

  // 处理生成翻译
  const handleGenerateTranslation = () => {
    if (onGenerateTranslation && !isGeneratingTranslation) {
      onGenerateTranslation(imageId, languageCode, originalImage)
    }
  }

  return (
    <div className="space-y-4">
      {/* 标题信息 */}
      <div className="mb-3">
        <h3 className="font-medium text-gray-900">
          {originalImage?.title ? (
            typeof originalImage.title === 'string' ? originalImage.title :
              originalImage.title.zh || originalImage.title.en || Object.values(originalImage.title)[0]
          ) : '未命名图片'}
        </h3>
        <p className="text-sm text-gray-500">
          原始内容 → {languageName}
        </p>
      </div>

      {/* 多语言内容编辑区域 - 完全复制ImageForm的样式 */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            {languageName}
          </h4>
          {onGenerateTranslation && !readOnly && languageCode !== 'zh' && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleGenerateTranslation}
              disabled={isGeneratingTranslation}
              className="flex items-center gap-1 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${isGeneratingTranslation ? 'animate-spin' : ''}`} />
              {isGeneratingTranslation ? '生成中...' : '生成国际化'}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左侧：名称、标题、描述、AI提示词 */}
          <div className="space-y-4">
            {/* 图片名称 */}
            {(translation.name !== undefined || !readOnly) && (
              <div>
                <Label>名称</Label>
                {readOnly ? (
                  <div className="mt-1 p-2 border rounded bg-white text-sm min-h-[36px] flex items-center">
                    {getDisplayText(translation.name) || '-'}
                  </div>
                ) : (
                  <Input
                    value={translation.name || ''}
                    onChange={(e) => onTranslationEdit(imageId, languageCode, 'name', e.target.value)}
                    placeholder={`输入${languageName}名称`}
                  />
                )}
              </div>
            )}

            {/* 图片标题 */}
            {(translation.title !== undefined || !readOnly) && (
              <div>
                <Label>标题</Label>
                {readOnly ? (
                  <div className="mt-1 p-2 border rounded bg-white text-sm min-h-[36px] flex items-center">
                    {getDisplayText(translation.title) || '-'}
                  </div>
                ) : (
                  <Input
                    value={translation.title || ''}
                    onChange={(e) => onTranslationEdit(imageId, languageCode, 'title', e.target.value)}
                    placeholder={`输入${languageName}标题`}
                  />
                )}
              </div>
            )}

            {/* 图片描述 */}
            {(translation.description !== undefined || !readOnly) && (
              <div>
                <Label>描述</Label>
                {readOnly ? (
                  <div className="mt-1 p-2 border rounded bg-white text-sm min-h-[56px] max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {getDisplayText(translation.description) || '-'}
                  </div>
                ) : (
                  <Textarea
                    value={translation.description || ''}
                    onChange={(e) => onTranslationEdit(imageId, languageCode, 'description', e.target.value)}
                    placeholder={`输入${languageName}描述`}
                    rows={2}
                  />
                )}
              </div>
            )}

            {/* AI提示词 */}
            {(translation.prompt !== undefined || !readOnly) && (
              <div>
                <Label>AI提示词</Label>
                {readOnly ? (
                  <div className="mt-1 p-2 border rounded bg-white text-sm min-h-[72px] max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {getDisplayText(translation.prompt) || '-'}
                  </div>
                ) : (
                  <Textarea
                    value={translation.prompt || ''}
                    onChange={(e) => onTranslationEdit(imageId, languageCode, 'prompt', e.target.value)}
                    placeholder={`输入${languageName}AI提示词`}
                    rows={3}
                  />
                )}
              </div>
            )}
          </div>

          {/* 右侧：文案内容（高度更高） */}
          <div>
            {(translation.additionalInfo !== undefined || !readOnly) && (
              <div>
                <Label>文案内容</Label>
                {readOnly ? (
                  <div className="mt-1 p-2 border rounded bg-white text-sm h-[408px] overflow-y-auto whitespace-pre-wrap">
                    {getDisplayText(translation.additionalInfo) || '-'}
                  </div>
                ) : (
                  <Textarea
                    value={translation.additionalInfo || ''}
                    onChange={(e) => onTranslationEdit(imageId, languageCode, 'additionalInfo', e.target.value)}
                    placeholder={`输入${languageName}文案内容`}
                    rows={17}
                    className="resize-none"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InternationalizationEditor 