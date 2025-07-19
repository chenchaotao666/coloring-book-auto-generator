import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect } from '@/components/ui/multi-select'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { apiFetch } from '@/config/api'
import {
  AlertCircle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
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

const CategoriesManager = () => {
  // 确认对话框
  const confirm = useConfirm()

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
  const [activeInternationalizationLanguage, setActiveInternationalizationLanguage] = useState('') // 国际化结果的活跃语言tab

  // 图片相关状态
  const [availableImages, setAvailableImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)

  // 全局AI设置状态
  const [aiModel, setAiModel] = useState('deepseek-chat')
  const defaultAiPrompt = `Generate a comprehensive category description for \${displayName} coloring pages. IMPORTANT: All section titles MUST be wrapped in <h2></h2> HTML tags. 

Follow this exact structure and quality level based on this Unicorn example:

EXAMPLE CONTENT (replace "Unicorn" with \${displayName} and add <h2></h2> tags to all titles):

Free Unicorn Coloring Pages: Magical Creatures Come to Life
Enter the enchanting realm of unicorn coloring pages where imagination meets the mystical beauty of these legendary creatures. Our collection features stunning printable coloring sheets that capture every magical detail from flowing manes to sparkling horns.

These fantasy coloring pages offer endless creative possibilities for artistic expression and imaginative play. Whether you're seeking engaging activities for children, therapeutic outlets for stress relief, or educational tools for developing fine motor skills, our designs will transport you into a world of rainbow magic and wonder.

Meet Unicorns: Symbols of Magic and Wonder
Unicorn coloring pages showcase these beloved mythical creatures known for their purity, grace, and magical healing powers throughout folklore and fairy tales. From ancient legends to modern fantasy stories, unicorns represent hope, innocence, and the power of believing in magic.

These mythical creature coloring sheets provide children with opportunities to explore creativity while learning about different cultures and storytelling traditions. The therapeutic benefits of coloring intricate unicorn details, flowing manes, and magical backgrounds help improve focus, reduce anxiety, and boost self-confidence.

Parents and educators appreciate how these fantasy-themed coloring activities naturally encourage discussions about imagination, kindness, and believing in oneself. Each coloring session becomes both entertaining and meaningful while developing artistic skills and color recognition abilities.

Coloring Tips for Perfect Unicorn Artwork
Material Selection: Choose your favorite unicorn coloring pages and gather quality coloring materials like colored pencils, markers, or gel pens for vibrant magical effects.

Rainbow Mane Magic: Create stunning rainbow manes using bold, vibrant colors in flowing patterns. Blend pink, purple, blue, and yellow for magical gradient effects that capture unicorn beauty.

Horn Detailing: Use metallic silver, gold, or pearl colors for the spiraled horn, adding small highlights to create dimensional shimmer and magical sparkle.

Background Enchantment: Fill backgrounds with pastel clouds, rainbow arcs, and twinkling stars using soft blues, pinks, and purples for dreamy magical landscapes.

Sparkle Effects: Add glitter, white gel pen dots, or leave small areas uncolored to represent magical sparkles and light reflecting off the unicorn's coat.

10 Creative DIY Ideas with Unicorn Coloring Pages
1. Bedroom Wall Gallery: Transform completed unicorn coloring pages into a magical bedroom gallery by framing them in pastel or white frames. Arrange multiple pieces in different sizes to create an enchanting unicorn sanctuary.

2. Birthday Party Decorations: Cut out colored unicorn figures and mount them on wooden sticks to create magical table centerpieces. Place in mason jars filled with colorful tissue paper and glitter for sparkly party displays.

3. Custom Greeting Cards: Fold shimmer cardstock and glue finished unicorn artwork to create personalized birthday cards, thank you notes, or friendship cards. Add rainbow washi tape and glitter for extra magical touches.

4. Educational Fantasy Books: Bind several printable coloring sheets together with colored pages to create personalized unicorn storybooks. Children can write their own magical adventures alongside their colored illustrations.

5. Collaborative Classroom Projects: Teachers can have students work together on large poster-sized unicorn scenes, with each child coloring different magical elements. Display finished collaborative artwork as inspiring classroom decorations celebrating creativity.

6. Personalized Bookmarks: Cut colored unicorn designs into bookmark shapes and laminate for durability. Punch holes and add rainbow ribbon tassels to create functional reading accessories perfect for fairy tale books.

7. Gift Wrapping Magic: Use completed unicorn coloring pages as unique wrapping paper for special gifts. The personalized touch makes presents extra magical, especially for unicorn enthusiasts and fantasy lovers.

8. Decorative Magnets: Glue finished coloring pages onto magnetic sheets, then cut around unicorn figures. These custom refrigerator magnets make wonderful keepsakes and can display important notes with magical flair.

9. Window Clings: Tape colored unicorn pages to windows to create beautiful translucent decorations. Natural light filtering through creates rainbow effects, especially when combined with prism decorations and crystal hangings.

10. Scrapbook Memory Pages: Incorporate fantasy coloring activities into family scrapbooks alongside photos from fantasy-themed parties, zoo visits, or magical movie nights. Add journaling about creative experiences and imagination.

Start Your Magical Coloring Adventure Today
Unleash your creativity with our stunning collection of unicorn coloring pages and experience the joy of bringing these mystical creatures to life through vibrant colors and imagination.

With instant access to premium designs and simple downloading, you can begin your artistic journey immediately and discover the therapeutic benefits of magical creative expression.

CRITICAL REQUIREMENTS:
- ALL section titles must use <h2></h2> tags exactly as shown above
- Replace "Unicorn" with \${displayName} throughout the content
- Follow the EXACT content structure, quality, and detail level from the example
- Include all 5 specific coloring techniques with detailed explanations
- Provide all 10 complete DIY ideas with specific, actionable instructions
- Maintain the same professional, engaging tone and comprehensive detail
- DO NOT use markdown formatting like **bold** or *italic* - use plain text only
- For technique names in coloring tips, use format like "Rainbow Mane Magic:" not "**Rainbow Mane Magic:**"`
  const [aiPrompt, setAiPrompt] = useState(defaultAiPrompt)
  
  // SEO相关AI提示词
  const defaultSeoTitlePrompt = `Write exactly one SEO title for \${displayName} coloring pages. Your response must be ONLY the title text. Do NOT include:
- Multiple options
- Explanations
- Character counts
- Formatting like ** or numbers
- Any other text

Title requirements:
- Under 60 characters
- Include "\${displayName} coloring pages"
- Include "free" and "printable"
- Engaging for kids/parents

Respond with ONLY the title. Nothing else.`
  const [seoTitlePrompt, setSeoTitlePrompt] = useState(defaultSeoTitlePrompt)
  
  const defaultSeoDescPrompt = `Write exactly one SEO meta description for \${displayName} coloring pages. Your response must be ONLY the description text. Do NOT include:
- Character counts like (158 characters)
- Checkmarks or bullet points
- Multiple options
- Explanations about keywords
- Formatting or emojis
- Any other text

Description requirements:
- Under 160 characters
- Include "\${displayName} coloring pages"
- Include "free", "printable", "download"
- Mention benefits for kids
- End with call-to-action

Respond with ONLY the description. Nothing else.`
  const [seoDescPrompt, setSeoDescPrompt] = useState(defaultSeoDescPrompt)
  
  const [showAiSettings, setShowAiSettings] = useState(false) // AI设置面板折叠状态

  // 表单状态
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeFormLanguage, setActiveFormLanguage] = useState('zh') // 表单的活跃语言
  const [formData, setFormData] = useState({
    displayName: { zh: '' },
    description: { zh: '' },
    seoTitle: { zh: '' },
    seoDesc: { zh: '' },
    imageId: ''
  })
  const [aiGeneratingDescription, setAiGeneratingDescription] = useState(false) // AI生成描述状态
  const [aiGeneratingSeoTitle, setAiGeneratingSeoTitle] = useState(false) // AI生成SEO标题状态
  const [aiGeneratingSeoDesc, setAiGeneratingSeoDesc] = useState(false) // AI生成SEO描述状态
  // 基础语言状态
  const [baseLanguage, setBaseLanguage] = useState('en') // 新增分类的基础语言，默认英文

  // AI模型选项
  const aiModelOptions = [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'gpt-4', label: 'GPT-4' }
  ]

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

  // 加载分类列表
  const loadCategories = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiFetch('/api/categories')
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
      const response = await apiFetch('/api/images?limit=100') // 获取前100张图片
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
  const resetForm = (language = 'zh') => {
    setFormData({
      displayName: { [language]: '' },
      description: { [language]: '' },
      seoTitle: { [language]: '' },
      seoDesc: { [language]: '' },
      imageId: '',
      hotness: 0
    })
    setEditingId(null)
    setActiveFormLanguage(language) // 使用传入的语言
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

  // 删除语言
  const handleDeleteLanguage = (langCode) => {
    if (!editingId) return // 只在编辑时允许删除

    const currentLanguages = Object.keys(formData.displayName || {})

    // 不能删除最后一个语言
    if (currentLanguages.length <= 1) {
      alert('至少需要保留一个语言')
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
      if (newData.seoTitle) {
        const { [langCode]: ___, ...restSeoTitle } = newData.seoTitle
        newData.seoTitle = restSeoTitle
      }
      if (newData.seoDesc) {
        const { [langCode]: ____, ...restSeoDesc } = newData.seoDesc
        newData.seoDesc = restSeoDesc
      }
      return newData
    })

    // 如果删除的是当前活跃语言，切换到剩余语言中的第一个
    if (activeFormLanguage === langCode) {
      const remainingLanguages = currentLanguages.filter(lang => lang !== langCode)
      if (remainingLanguages.length > 0) {
        setActiveFormLanguage(remainingLanguages[0])
      }
    }
  }



  // 获取分类的现有语言
  const getExistingLanguages = (category) => {
    const languages = new Set()

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

    // 如果没有找到任何语言，默认返回中文
    return Array.from(languages).length > 0 ? Array.from(languages) : ['zh']
  }

  // 开始编辑
  const startEdit = (category) => {
    // 数据库字段名是 display_name, description, seo_title, seo_desc
    let displayName = {}
    let description = {}
    let seoTitle = {}
    let seoDesc = {}

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

    // 处理 seo_title 字段
    if (typeof category.seo_title === 'string') {
      try {
        seoTitle = JSON.parse(category.seo_title)
      } catch {
        seoTitle = { zh: category.seo_title }
      }
    } else if (typeof category.seo_title === 'object') {
      seoTitle = category.seo_title || {}
    }

    // 处理 seo_desc 字段
    if (typeof category.seo_desc === 'string') {
      try {
        seoDesc = JSON.parse(category.seo_desc)
      } catch {
        seoDesc = { zh: category.seo_desc }
      }
    } else if (typeof category.seo_desc === 'object') {
      seoDesc = category.seo_desc || {}
    }

    const imageId = category.image_id || ''
    const hotness = category.hotness || 0
    setFormData({
      displayName: displayName || { zh: '' },
      description: description || { zh: '' },
      seoTitle: seoTitle || { zh: '' },
      seoDesc: seoDesc || { zh: '' },
      imageId: imageId,
      hotness: hotness
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

    // 设置活跃语言为可用语言的第一个
    const existingLanguages = getExistingLanguages(category)
    setActiveFormLanguage(existingLanguages.includes('zh') ? 'zh' : existingLanguages[0])
  }

  // 开始新增
  const startAdd = () => {
    resetForm(baseLanguage) // 传递基础语言给resetForm
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

    // 验证必填字段 - 确保至少有一个语言有名称
    const hasAnyName = Object.values(formData.displayName || {}).some(name => name && name.trim())
    if (!hasAnyName) {
      setError('请至少输入一个语言的名称')
      return
    }

    setLoading(true)
    setError('')

    try {
      const requestData = {
        displayName: formData.displayName,
        description: formData.description,
        seoTitle: formData.seoTitle,
        seoDesc: formData.seoDesc,
        imageId: formData.imageId.trim(),
        hotness: parseInt(formData.hotness) || 0
      }

      let response
      if (editingId) {
        // 更新
        response = await apiFetch(`/api/categories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(requestData)
        })
      } else {
        // 新增
        response = await apiFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify(requestData)
        })
      }

      const data = await response.json()

      if (data.success) {
        setSuccess(editingId ? '分类更新成功！' : '分类创建成功！')
        setShowForm(false)
        resetForm()
        loadCategories() // 重新加载列表

        // 触发分类更新事件，通知主应用刷新saveOptions
        eventBus.emit('categoryUpdated', { action: editingId ? 'update' : 'create', id: editingId || data.data?.id })
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
    if (!(await confirm(`确定要删除分类 "${displayName}" 吗？`, {
      title: '删除分类',
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger'
    }))) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await apiFetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('分类删除成功！')
        loadCategories() // 重新加载列表

        // 触发分类更新事件，通知主应用刷新saveOptions
        eventBus.emit('categoryUpdated', { action: 'delete', id: categoryId })
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
        items: selectedCategories.map(cat => {
          const nameBase = getBaseLanguageContent(cat.display_name)
          const descBase = getBaseLanguageContent(cat.description)
          const seoTitleBase = getBaseLanguageContent(cat.seo_title)
          const seoDescBase = getBaseLanguageContent(cat.seo_desc)

          return {
            id: cat.category_id,
            name: nameBase.content,
            description: descBase.content,
            seoTitle: seoTitleBase.content,
            seoDesc: seoDescBase.content,
            baseLanguage: nameBase.lang === 'en' || descBase.lang === 'en' || seoTitleBase.lang === 'en' || seoDescBase.lang === 'en' ? 'en' : 'zh' // 如果任一字段有英文就用英文作为基础语言
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

  // 生成分类描述
  const generateDescription = async (categoryId) => {
    try {
      const category = categories.find(c => c.category_id === categoryId)
      if (!category) {
        setError('找不到指定的分类')
        return
      }

      // 确定生成语言：优先中文，然后英文，最后是第一个可用语言
      const existingLanguages = getExistingLanguages(category)
      let targetLanguage = 'zh' // 默认中文
      if (existingLanguages.includes('zh')) {
        targetLanguage = 'zh'
      } else if (existingLanguages.includes('en')) {
        targetLanguage = 'en'
      } else if (existingLanguages.length > 0) {
        targetLanguage = existingLanguages[0]
      }

      const displayName = formatDisplayName(category.display_name)
      const response = await apiFetch('/api/generate-category-description', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          displayName,
          model: aiModel,
          prompt: aiPrompt,
          language: targetLanguage // 传递目标语言
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || '生成描述失败')
      }

      // 更新分类列表中的描述
      setCategories(prev => prev.map(cat => {
        if (cat.category_id === categoryId) {
          return {
            ...cat,
            description: data.description
          }
        }
        return cat
      }))

      setSuccess('描述生成成功')
    } catch (error) {
      console.error('生成描述错误:', error)
      setError('生成描述失败: ' + error.message)
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
        setActiveInternationalizationLanguage('') // 清除活跃语言
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
    <div className="mx-auto p-6 space-y-6">
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
            <Button
              onClick={startAdd}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增分类
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


        {/* AI设置 */}
        <Card>
          <CardHeader className="cursor-pointer" onClick={() => setShowAiSettings(!showAiSettings)}>
            <div className="flex items-center justify-between">
              <CardTitle>AI文案生成设置</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-8 w-8"
              >
                {showAiSettings ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {showAiSettings && (
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：模型选择和描述提示词 */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="aiModel" className="text-sm font-medium">文案模型</Label>
                    <Select value={aiModel} onValueChange={setAiModel}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {aiModelOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="aiPrompt" className="text-sm font-medium">描述生成提示词</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAiPrompt(defaultAiPrompt)}
                        className="text-xs h-6 px-2"
                      >
                        重置默认
                      </Button>
                    </div>
                    <Textarea
                      id="aiPrompt"
                      placeholder="输入AI描述生成提示词，使用 ${displayName} 作为分类名称的占位符"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={12}
                      className="resize-none text-sm"
                    />
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• 使用 <code className="bg-gray-100 px-1 rounded">{'${displayName}'}</code> 作为分类名称的占位符</p>
                      <p>• 用于生成分类详细描述内容</p>
                    </div>
                  </div>
                </div>

                {/* 中间：SEO标题提示词 */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="seoTitlePrompt" className="text-sm font-medium">SEO标题生成提示词</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeoTitlePrompt(defaultSeoTitlePrompt)}
                        className="text-xs h-6 px-2"
                      >
                        重置默认
                      </Button>
                    </div>
                    <Textarea
                      id="seoTitlePrompt"
                      placeholder="输入AI SEO标题生成提示词，使用 ${displayName} 作为分类名称的占位符"
                      value={seoTitlePrompt}
                      onChange={(e) => setSeoTitlePrompt(e.target.value)}
                      rows={16}
                      className="resize-none text-sm"
                    />
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• 用于生成SEO优化的页面标题</p>
                      <p>• 建议长度: 50-60字符</p>
                    </div>
                  </div>
                </div>

                {/* 右侧：SEO描述提示词 */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="seoDescPrompt" className="text-sm font-medium">SEO描述生成提示词</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSeoDescPrompt(defaultSeoDescPrompt)}
                        className="text-xs h-6 px-2"
                      >
                        重置默认
                      </Button>
                    </div>
                    <Textarea
                      id="seoDescPrompt"
                      placeholder="输入AI SEO描述生成提示词，使用 ${displayName} 作为分类名称的占位符"
                      value={seoDescPrompt}
                      onChange={(e) => setSeoDescPrompt(e.target.value)}
                      rows={16}
                      className="resize-none text-sm"
                    />
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• 用于生成SEO优化的页面描述</p>
                      <p>• 建议长度: 150-160字符</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

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
                  {Object.entries(internationalizationResults).map(([categoryId, translations]) => {
                    const category = categories.find(cat => cat.category_id.toString() === categoryId)
                    const translation = translations[activeInternationalizationLanguage]

                    if (!category || !translation) return null

                    return (
                      <div key={categoryId} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-3">
                          <h3 className="font-medium text-gray-900">
                            {formatDisplayName(category.display_name)}
                          </h3>
                          <p className="text-sm text-gray-500">
                            原始内容 → {supportedLanguages.find(lang => lang.code === activeInternationalizationLanguage)?.name || activeInternationalizationLanguage}
                          </p>
                        </div>

                        <div className="space-y-3">
                          {/* 分类名称 */}
                          {translation.name !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">分类名称</Label>
                              <Input
                                value={translation.name || ''}
                                onChange={(e) => handleTranslationEdit(categoryId, activeInternationalizationLanguage, 'name', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译名称"
                              />
                            </div>
                          )}

                          {/* 分类描述 */}
                          {translation.description !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">分类描述</Label>
                              <Textarea
                                value={translation.description || ''}
                                onChange={(e) => handleTranslationEdit(categoryId, activeInternationalizationLanguage, 'description', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译描述"
                                rows={8}
                              />
                            </div>
                          )}

                          {/* SEO标题 */}
                          {translation.seoTitle !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">SEO标题</Label>
                              <Input
                                value={translation.seoTitle || ''}
                                onChange={(e) => handleTranslationEdit(categoryId, activeInternationalizationLanguage, 'seoTitle', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译SEO标题"
                                maxLength={60}
                              />
                              <div className="text-xs text-gray-400 mt-1">
                                建议长度: 50-60字符 (当前: {(translation.seoTitle || '').length}字符)
                              </div>
                            </div>
                          )}

                          {/* SEO描述 */}
                          {translation.seoDesc !== undefined && (
                            <div>
                              <Label className="text-xs text-gray-600">SEO描述</Label>
                              <Textarea
                                value={translation.seoDesc || ''}
                                onChange={(e) => handleTranslationEdit(categoryId, activeInternationalizationLanguage, 'seoDesc', e.target.value)}
                                className="mt-1 text-sm bg-gray-50"
                                placeholder="翻译SEO描述"
                                rows={3}
                                maxLength={160}
                              />
                              <div className="text-xs text-gray-400 mt-1">
                                建议长度: 150-160字符 (当前: {(translation.seoDesc || '').length}字符)
                              </div>
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
            {/* 国际化操作栏（在表格上面，仅在有选中项目时显示）*/}
            {selectedItems.size > 0 && (
              <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <Languages className="w-4 h-4" />
                  <span className="font-medium">
                    已选择 {selectedItems.size} 个分类
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
                      <th className="border border-gray-200 px-4 py-2 text-left">名称</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">描述</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">热度</th>
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
                            <div className="font-medium">
                              {formatDisplayNameBilingual(category.display_name)}
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 max-w-xs">
                            <div className="flex items-center gap-2">
                              <div className="truncate flex-1" title={formatDescription(category.description)}>
                                {formatDescription(category.description) || '暂无描述'}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => generateDescription(category.category_id)}
                                className="flex-shrink-0 p-1 h-6"
                                title="使用AI生成描述"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-sm font-medium">{category.hotness || 0}</span>
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-400 to-red-500 rounded-full"
                                  style={{ width: `${Math.min(100, (category.hotness || 0) / 10)}%` }}
                                ></div>
                              </div>
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
                                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => {
                                          // 优先显示上色版本，然后是默认版本
                                          const urls = [image.coloringUrl, image.defaultUrl].filter(Boolean)
                                          if (urls.length > 0) {
                                            window.open(urls[0], '_blank')
                                          }
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none'
                                          e.target.nextSibling.style.display = 'flex'
                                        }}
                                        title="点击查看原图"
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
                    setActiveInternationalizationLanguage('') // 清除活跃语言
                  }}
                >
                  取消
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 新增/编辑表单弹出框 */}
      <Dialog isOpen={showForm} onClose={() => {
        setShowForm(false)
        resetForm()
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="space-y-6">
            <div className="border-b pb-4">
              <h2 className="text-xl font-semibold">{editingId ? '编辑分类' : '新增分类'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 多语言内容编辑 */}
              {(() => {
                const languages = editingId
                  ? Object.keys(formData.displayName || {}).length > 0
                    ? Object.keys(formData.displayName)
                    : getExistingLanguages(categories.find(cat => cat.category_id === editingId))
                  : [baseLanguage] // 使用选中的基础语言而不是硬编码的'zh'

                return (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">多语言内容</h3>

                    {/* 语言选项卡 */}
                    <div className="flex flex-wrap gap-2 border-b mb-4">
                      {languages.map(langCode => {
                        const language = supportedLanguages.find(lang => lang.code === langCode) || { name: langCode === 'zh' ? '中文' : langCode }
                        const isActive = activeFormLanguage === langCode
                        const isRequired = (!editingId && langCode === baseLanguage)
                        const canDelete = editingId && languages.length > 1

                        return (
                          <div key={langCode} className="relative group">
                            <button
                              type="button"
                              onClick={() => setActiveFormLanguage(langCode)}
                              className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${isActive
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <Languages className="w-4 h-4" />
                                {language.name}
                                {isRequired && <span className="text-red-500">*</span>}
                              </div>
                            </button>
                            {/* 删除语言按钮 */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteLanguage(langCode)
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
                                title={`删除${language.name}语言`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* 当前语言的内容编辑 */}
                    {activeFormLanguage && (
                      <div className="space-y-4">
                        {(() => {
                          const language = supportedLanguages.find(l => l.code === activeFormLanguage) || { name: activeFormLanguage === 'zh' ? '中文' : activeFormLanguage }

                          return (
                            <div className="border border-gray-200 rounded-lg p-4">
                              <div className="mb-3">
                                <h4 className="font-medium text-gray-900">
                                  {language.name}内容编辑
                                </h4>
                                <p className="text-sm text-gray-500">
                                  编辑{language.name}版本的分类信息
                                </p>
                              </div>

                              <div className="space-y-4">
                                {/* 分类名称 */}
                                <div>
                                  <Label htmlFor={`displayName_${activeFormLanguage}`} className="text-sm text-gray-600">
                                    分类名称 {(!editingId && activeFormLanguage === baseLanguage) && <span className="text-red-500">*</span>}
                                  </Label>
                                  <Input
                                    id={`displayName_${activeFormLanguage}`}
                                    value={formData.displayName[activeFormLanguage] || ''}
                                    onChange={(e) => handleInputChange('displayName', activeFormLanguage, e.target.value)}
                                    placeholder={`请输入${language.name}分类名称${(!editingId && activeFormLanguage === baseLanguage) ? '（必填）' : '（可选）'}`}
                                    required={(!editingId && activeFormLanguage === baseLanguage)}
                                    className="mt-1"
                                  />
                                </div>

                                {/* 分类描述 */}
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={`description_${activeFormLanguage}`} className="text-sm text-gray-600">
                                      分类描述
                                    </Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="link"
                                      disabled={aiGeneratingDescription || !formData.displayName[activeFormLanguage]}
                                      onClick={async () => {
                                        if (!formData.displayName[activeFormLanguage]) {
                                          alert(`请先输入${language.name}名称`)
                                          return
                                        }

                                        setAiGeneratingDescription(true)
                                        try {
                                          // 使用当前AI设置生成描述
                                          const displayName = formData.displayName[activeFormLanguage]
                                          const prompt = aiPrompt.replace(/\$\{displayName\}/g, displayName)

                                          const response = await apiFetch('/api/generate-text', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                              model: aiModel,
                                              prompt: prompt,
                                              language: activeFormLanguage // 传递当前活跃的语言
                                            })
                                          })

                                          const data = await response.json()
                                          if (!response.ok) {
                                            throw new Error(data.message || '生成失败')
                                          }

                                          // 更新描述字段
                                          handleInputChange('description', activeFormLanguage, data.content)

                                        } catch (error) {
                                          console.error('生成描述错误:', error)
                                          alert('生成描述失败: ' + error.message)
                                        } finally {
                                          setAiGeneratingDescription(false)
                                        }
                                      }}
                                      className="text-xs h-auto p-1 text-blue-600 hover:text-blue-800"
                                      title={`使用AI生成${language.name}描述`}
                                    >
                                      {aiGeneratingDescription ? (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          生成中...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3" />
                                          AI生成
                                        </span>
                                      )}
                                    </Button>
                                  </div>
                                  <Textarea
                                    id={`description_${activeFormLanguage}`}
                                    value={formData.description[activeFormLanguage] || ''}
                                    onChange={(e) => handleInputChange('description', activeFormLanguage, e.target.value)}
                                    placeholder={`请输入${language.name}分类描述（可选）`}
                                    rows={16}
                                    className="mt-1"
                                  />
                                </div>

                                {/* SEO标题 */}
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={`seoTitle_${activeFormLanguage}`} className="text-sm text-gray-600">
                                      SEO标题
                                    </Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="link"
                                      disabled={aiGeneratingSeoTitle || !formData.displayName[activeFormLanguage]}
                                      onClick={async () => {
                                        if (!formData.displayName[activeFormLanguage]) {
                                          alert(`请先输入${language.name}名称`)
                                          return
                                        }

                                        setAiGeneratingSeoTitle(true)
                                        try {
                                          const displayName = formData.displayName[activeFormLanguage]
                                          const prompt = seoTitlePrompt.replace(/\$\{displayName\}/g, displayName)

                                          const response = await apiFetch('/api/generate-text', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                              model: aiModel,
                                              prompt: prompt,
                                              language: activeFormLanguage
                                            })
                                          })

                                          const data = await response.json()
                                          if (!response.ok) {
                                            throw new Error(data.message || '生成失败')
                                          }

                                          handleInputChange('seoTitle', activeFormLanguage, data.content)

                                        } catch (error) {
                                          console.error('生成SEO标题错误:', error)
                                          alert('生成SEO标题失败: ' + error.message)
                                        } finally {
                                          setAiGeneratingSeoTitle(false)
                                        }
                                      }}
                                      className="text-xs h-auto p-1 text-blue-600 hover:text-blue-800"
                                      title={`使用AI生成${language.name}SEO标题`}
                                    >
                                      {aiGeneratingSeoTitle ? (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          生成中...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3" />
                                          AI生成
                                        </span>
                                      )}
                                    </Button>
                                  </div>
                                  <Input
                                    id={`seoTitle_${activeFormLanguage}`}
                                    value={formData.seoTitle[activeFormLanguage] || ''}
                                    onChange={(e) => handleInputChange('seoTitle', activeFormLanguage, e.target.value)}
                                    placeholder={`请输入${language.name}SEO标题（可选）`}
                                    className="mt-1"
                                    maxLength={60}
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    建议长度: 50-60字符 (当前: {(formData.seoTitle[activeFormLanguage] || '').length}字符)
                                  </div>
                                </div>

                                {/* SEO描述 */}
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label htmlFor={`seoDesc_${activeFormLanguage}`} className="text-sm text-gray-600">
                                      SEO描述
                                    </Label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="link"
                                      disabled={aiGeneratingSeoDesc || !formData.displayName[activeFormLanguage]}
                                      onClick={async () => {
                                        if (!formData.displayName[activeFormLanguage]) {
                                          alert(`请先输入${language.name}名称`)
                                          return
                                        }

                                        setAiGeneratingSeoDesc(true)
                                        try {
                                          const displayName = formData.displayName[activeFormLanguage]
                                          const prompt = seoDescPrompt.replace(/\$\{displayName\}/g, displayName)

                                          const response = await apiFetch('/api/generate-text', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                              model: aiModel,
                                              prompt: prompt,
                                              language: activeFormLanguage
                                            })
                                          })

                                          const data = await response.json()
                                          if (!response.ok) {
                                            throw new Error(data.message || '生成失败')
                                          }

                                          handleInputChange('seoDesc', activeFormLanguage, data.content)

                                        } catch (error) {
                                          console.error('生成SEO描述错误:', error)
                                          alert('生成SEO描述失败: ' + error.message)
                                        } finally {
                                          setAiGeneratingSeoDesc(false)
                                        }
                                      }}
                                      className="text-xs h-auto p-1 text-blue-600 hover:text-blue-800"
                                      title={`使用AI生成${language.name}SEO描述`}
                                    >
                                      {aiGeneratingSeoDesc ? (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          生成中...
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1">
                                          <RefreshCw className="w-3 h-3" />
                                          AI生成
                                        </span>
                                      )}
                                    </Button>
                                  </div>
                                  <Textarea
                                    id={`seoDesc_${activeFormLanguage}`}
                                    value={formData.seoDesc[activeFormLanguage] || ''}
                                    onChange={(e) => handleInputChange('seoDesc', activeFormLanguage, e.target.value)}
                                    placeholder={`请输入${language.name}SEO描述（可选）`}
                                    rows={3}
                                    className="mt-1"
                                    maxLength={160}
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    建议长度: 150-160字符 (当前: {(formData.seoDesc[activeFormLanguage] || '').length}字符)
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })()}

              <div>
                <Label htmlFor="hotness">热度值</Label>
                <Input
                  id="hotness"
                  type="number"
                  min="0"
                  max="1000"
                  value={formData.hotness || 0}
                  onChange={(e) => setFormData(prev => ({ ...prev, hotness: parseInt(e.target.value) || 0 }))}
                  placeholder="请输入热度值（0-1000）"
                />
                <p className="text-sm text-gray-500 mt-1">热度值范围：0-1000，数值越高表示越热门</p>
              </div>

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
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(selectedImage.defaultUrl, '_blank')}
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                              title="点击查看原图"
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
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(selectedImage.coloringUrl, '_blank')}
                              onError={(e) => {
                                e.target.style.display = 'none'
                                e.target.nextSibling.style.display = 'flex'
                              }}
                              title="点击查看原图"
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

              <div className="flex gap-2 pt-4 border-t">
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
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  disabled={loading}
                >
                  取消
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CategoriesManager 