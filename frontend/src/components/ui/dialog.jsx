import { X } from 'lucide-react'
import React, { useEffect } from 'react'
import { Button } from './button'

const Dialog = ({ isOpen, onClose, children, title, maxWidth = 'max-w-6xl' }) => {
  // 按ESC键关闭弹窗
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27 && isOpen && onClose) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose ? onClose : undefined}
      />

      {/* 弹窗内容 */}
      <div className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* 标题栏 */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

const DialogHeader = ({ children, className = '' }) => {
  return (
    <div className={`p-6 pb-4 ${className}`}>
      {children}
    </div>
  )
}

const DialogTitle = ({ children, className = '' }) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  )
}

const DialogContent = ({ children, className = '' }) => {
  return (
    <div className={`px-6 pb-6 ${className}`}>
      {children}
    </div>
  )
}

const DialogFooter = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center justify-end gap-2 p-6 pt-4 border-t bg-gray-50 ${className}`}>
      {children}
    </div>
  )
}

export {
  Dialog, DialogContent,
  DialogFooter, DialogHeader,
  DialogTitle
}
