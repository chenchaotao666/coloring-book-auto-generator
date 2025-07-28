// 默认提示词配置
export const DEFAULT_PROMPTS = {
  // 文生图提示词（用于指导AI如何从文字生成涂色线稿图片）
  TEXT_TO_IMAGE: 'The image is a black and white line drawing for coloring, no color content',
  
  // 图生图提示词（用于指导AI如何将彩色图片转换为涂色线稿）
  IMAGE_TO_IMAGE: '将图片转换为适合儿童涂色的黑白线稿，保留主要轮廓，去除细节和色彩，线条简洁清晰',
  
  // 图片上色提示词（用于指导AI如何为图片上色）
  COLORING: '用马克笔给图像上色，要求色彩饱和度高，鲜艳明亮，色彩丰富，色彩对比鲜明，色彩层次分明'
}

// 难度等级对应的默认提示词模板
export const DIFFICULTY_PROMPTS = [
  'extremely simple shapes, very thick lines, minimal details, very easy for young children (2-5 years)',
  'simple shapes, clear outlines, moderate details, suitable for children (5-10 years)',
  'moderate complexity, detailed elements, suitable for teenagers (10-18 years)',
  'complex designs, fine details, challenging patterns, suitable for adults (18+ years)'
]

// 提示词标签和描述
export const PROMPT_LABELS = {
  TEXT_TO_IMAGE: {
    title: '文生图提示词（用于指导AI如何从文字生成涂色线稿图片）',
    description: '这个提示词将用于文生图功能，从文字生成黑白涂色线稿',
    placeholder: '输入文生图提示词，用于指导AI如何从文字生成涂色线稿图片'
  },
  IMAGE_TO_IMAGE: {
    title: '图生图提示词（用于指导AI如何将彩色图片转换为涂色线稿）',
    description: '这个提示词将用于图生图功能，将彩色图片转换为黑白涂色线稿',
    placeholder: '输入图生图提示词，用于指导AI如何将彩色图片转换为涂色线稿'
  },
  COLORING: {
    title: '图片上色提示词（用于指导AI如何为图片上色）',
    description: '这个提示词将用于生成上色图片功能，为黑白线稿图片上色',
    placeholder: '输入上色提示词，用于指导AI如何为图片上色'
  }
}

// 编辑对话框标题
export const DIALOG_TITLES = {
  TEXT_TO_IMAGE: '编辑文生图提示词',
  IMAGE_TO_IMAGE: '编辑图生图提示词',
  COLORING: '编辑图片上色提示词'
}

// 根据URL类型获取对应的提示词类型
export const getPromptTypeByUrlType = (urlType) => {
  const mapping = {
    'defaultUrl': 'TEXT_TO_IMAGE',
    'coloringUrl': 'COLORING',
    'colorUrl': 'IMAGE_TO_IMAGE'
  }
  return mapping[urlType] || 'TEXT_TO_IMAGE'
}