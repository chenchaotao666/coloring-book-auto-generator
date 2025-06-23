import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Check, Download, Edit3, Image, PlusCircle, Save, Trash2, X } from 'lucide-react'
import React, { useState } from 'react'

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
  const [editingId, setEditingId] = useState(null)
  const [editingField, setEditingField] = useState('')
  const [editingValue, setEditingValue] = useState('')

  // 默认文案模板
  const defaultTemplate = `上色技巧：如何把马赛克瓷砖纹理的蝴蝶填色页涂得好看？
在给蝴蝶上色时，可以考虑使用明亮的颜色，如黄色、蓝色和粉色，营造生动的效果。可以使用同种颜色的不同色调为翅膀增添层次感。尝试用对比色给花朵上色，使其更加突出。别忘了用绿色为草地上色，以平衡色彩斑斓的蝴蝶。鼓励孩子们尝试颜色混合和渐变，以达到更具艺术效果的呈现。他们还可以在每个几何形状中添加条纹或点纹样，使蝴蝶更加独特。

上色挑战：马赛克瓷砖纹理的蝴蝶的哪些部分难以上色并需要注意？
1. 蝴蝶翅膀上的几何图案较为复杂，填充这些小形状可能需要细心，以避免走线。 2. 选择互补的颜色可能会有挑战性。孩子们可能会难以找到和谐的调色板，形成令人愉悦的视觉效果。 3. 蝴蝶的对称性意味着为一侧上色时，另一侧也需镜像处理，这需要更多的专注和耐心。 4. 在马赛克区域内混合颜色可能很困难，尤其是对于仍在掌握填色技巧的年轻艺术家。 5. 最后，在确保蝴蝶突出时平衡花朵和草地的颜色，可能成为一个棘手的设计挑战。

填色书的好处：绘制马赛克瓷砖纹理的蝴蝶填色页的优点
给这幅蝴蝶上色有许多好处。它有助于发展精细的运动技能，因为孩子们练习握住蜡笔并保持在图形内。它还鼓励创造力，让孩子们选择自己的颜色和图案。这个活动可以提高专注力和注意力，因为孩子们致力于完成复杂的设计。此外，填色有舒缓效果，有助于减少压力和焦虑。涂色活动还能激发孩子们的想象力，让他们了解自然和艺术。总之，填色这只蝴蝶不仅有趣，而且是一次很好的学习体验。`

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
      const response = await fetch('http://localhost:3002/api/generate-themes', {
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
                  // 显示生成的主题
                  setContentList(prev => [...prev, {
                    ...data.content,
                    imagePath: null
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
      const response = await fetch('http://localhost:3002/api/generate-content', {
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
    try {
      const response = await fetch('http://localhost:3002/api/generate-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contentList.map(item => ({
            id: item.id,
            prompt: item.prompt
          }))
        }),
      })

      if (!response.ok) {
        throw new Error('生成图片失败')
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
              if (data.type === 'image') {
                setContentList(prev => prev.map(item =>
                  item.id === data.id
                    ? { ...item, imagePath: data.imagePath }
                    : item
                ))
              }
            } catch (e) {
              console.error('解析数据失败:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('生成图片失败:', error)
      alert('生成图片失败: ' + error.message)
    } finally {
      setIsGeneratingImages(false)
    }
  }

  // 导出Excel
  const exportToExcel = async () => {
    if (contentList.length === 0) {
      alert('没有内容可导出')
      return
    }

    try {
      const response = await fetch('http://localhost:3002/api/export-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents: contentList }),
      })

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `涂色书内容_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败: ' + error.message)
    }
  }

  // 保存内容到本地文件
  const saveContent = async () => {
    if (contentList.length === 0) {
      alert('没有内容可保存')
      return
    }

    try {
      const response = await fetch('http://localhost:3002/api/save-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: formData.keyword,
          description: formData.description,
          model: formData.model,
          contents: contentList
        }),
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      const result = await response.json()
      alert(`保存成功！文件：${result.filename}`)
    } catch (error) {
      console.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    }
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">涂色书内容自动生成器</h1>

        {/* 输入表单 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>内容生成设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="keyword">关键词 *</Label>
                <Input
                  id="keyword"
                  placeholder="如：蜘蛛侠、超人、蝴蝶等"
                  value={formData.keyword}
                  onChange={(e) => handleInputChange('keyword', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">附加描述（可选）</Label>
                <Input
                  id="description"
                  placeholder="对关键词的补充描述"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="count">生成数量</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.count}
                  onChange={(e) => handleInputChange('count', parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">选择模型</Label>
                <Select value={formData.model} onValueChange={(value) => handleInputChange('model', value)}>
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="template">文案模板</Label>
              <Textarea
                id="template"
                placeholder="输入文案模板，留空使用默认模板"
                value={formData.template}
                onChange={(e) => handleInputChange('template', e.target.value)}
                rows={8}
              />
            </div>

            <div className="space-y-4">
              {/* 流程说明 */}
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <div className="font-medium mb-1">生成流程：</div>
                <div>1. 首先点击"生成主题"按钮，根据关键词生成多个主题和prompt</div>
                <div>2. 查看并编辑生成的prompt（可选）</div>
                <div>3. 点击"生成文案"按钮，根据主题和prompt生成详细的涂色文案</div>
              </div>

              <div className="flex flex-wrap gap-4">
                {/* 第一步：生成主题 */}
                <Button
                  onClick={generateThemes}
                  disabled={isGeneratingThemes}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  {isGeneratingThemes ? '生成主题中...' : '1. 生成主题'}
                </Button>

                {/* 第二步：生成文案 */}
                <Button
                  onClick={generateContent}
                  disabled={isGeneratingContent || contentList.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  {isGeneratingContent ? '生成文案中...' : '2. 生成文案'}
                </Button>

                <Button
                  onClick={generateImages}
                  disabled={isGeneratingImages || contentList.length === 0}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Image className="w-4 h-4" />
                  {isGeneratingImages ? '生成图片中...' : '生成图片'}
                </Button>

                <Button
                  onClick={saveContent}
                  disabled={contentList.length === 0}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存内容
                </Button>

                <Button
                  onClick={exportToExcel}
                  disabled={contentList.length === 0}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出Excel
                </Button>
              </div>
            </div>

            {/* 生成进度显示 */}
            {generationProgress && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">
                    {generationProgress.message}
                  </span>
                  <span className="text-sm text-blue-700">
                    {generationProgress.current}/{generationProgress.totalSteps || generationProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${(generationProgress.current / (generationProgress.totalSteps || generationProgress.total)) * 100}%`
                    }}
                  ></div>
                </div>

                {/* 阶段指示器 */}
                {generationProgress.phase > 0 && (
                  <div className="mt-3 flex items-center justify-center space-x-4 text-xs">
                    <div className={`flex items-center space-x-1 ${generationProgress.phase >= 1 ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${generationProgress.phase >= 1 ? 'bg-blue-600' : 'bg-gray-300'
                        }`}></div>
                      <span>生成主题</span>
                    </div>

                    <div className="w-8 h-px bg-gray-300"></div>

                    <div className={`flex items-center space-x-1 ${generationProgress.phase >= 2 ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                      <div className={`w-2 h-2 rounded-full ${generationProgress.phase >= 2 ? 'bg-blue-600' : 'bg-gray-300'
                        }`}></div>
                      <span>生成内容</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 生成的内容列表 */}
        {contentList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>生成的内容 ({contentList.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {contentList.map((item) => (
                  <div key={item.id} className="border rounded-lg p-6 bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">内容 #{contentList.indexOf(item) + 1}</h3>
                        {/* 生成状态指示器 */}
                        {item.content === null ? (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            仅主题 - 待生成文案
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ✓ 主题+文案完成
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteContent(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        {/* 标题 */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="font-medium">标题</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item.id, 'title', item.title)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </div>
                          {editingId === item.id && editingField === 'title' ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="flex-1"
                              />
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-gray-700">{item.title}</p>
                          )}
                        </div>

                        {/* 简要描述 */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="font-medium">简要描述</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item.id, 'description', item.description)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </div>
                          {editingId === item.id && editingField === 'description' ? (
                            <div className="flex gap-2">
                              <Textarea
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="flex-1"
                                rows={3}
                              />
                              <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={saveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 text-sm">{item.description}</p>
                          )}
                        </div>

                        {/* Prompt */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="font-medium">图片生成Prompt</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEdit(item.id, 'prompt', item.prompt)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                          </div>
                          {editingId === item.id && editingField === 'prompt' ? (
                            <div className="flex gap-2">
                              <Textarea
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                className="flex-1"
                                rows={3}
                              />
                              <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={saveEdit}>
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded">{item.prompt}</p>
                          )}
                        </div>

                        {/* 图片路径 */}
                        {item.imagePath && (
                          <div>
                            <Label className="font-medium">图片路径</Label>
                            <p className="text-green-600 text-sm">{item.imagePath}</p>
                          </div>
                        )}
                      </div>

                      {/* 内容文案 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="font-medium">内容文案</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(item.id, 'content', item.content)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                        {editingId === item.id && editingField === 'content' ? (
                          <div className="flex gap-2">
                            <Textarea
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="flex-1"
                              rows={12}
                            />
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">
                            {item.content}
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
      </div>
    </div>
  )
}

export default App