import React, { useMemo, useCallback } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import './RichTextEditor.css'

const RichTextEditor = ({ value, onChange, placeholder, className = '', ...props }) => {
  // 配置工具栏和模块
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false // 改善粘贴体验
    }
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'link', 'image',
    'blockquote', 'code-block'
  ]

  const handleChange = useCallback((content) => {
    onChange(content)
  }, [onChange])


  return (
    <div className={`rich-text-editor-wrapper border border-gray-300 rounded-md ${className}`}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        preserveWhitespace={false}
        {...props}
      />
    </div>
  )
}

export default React.memo(RichTextEditor)