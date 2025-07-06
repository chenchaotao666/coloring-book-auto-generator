import React, { createContext, useContext, useState } from 'react'
import { Button } from './button'
import { Dialog } from './dialog'

// 创建确认对话框上下文
const ConfirmDialogContext = createContext()

// 确认对话框提供者组件
export function ConfirmDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const confirm = (message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        message,
        title: options.title || '确认操作',
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '取消',
        type: options.type || 'default', // default, danger, warning
        onConfirm: () => {
          setDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setDialog(null)
          resolve(false)
        }
      })
    })
  }

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      {dialog && (
        <Dialog isOpen={true} onClose={() => dialog.onCancel()} maxWidth="max-w-md">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {dialog.type === 'danger' && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {dialog.type === 'warning' && (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
                {dialog.type === 'default' && (
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {dialog.title}
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{dialog.message}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={dialog.onCancel}
              >
                {dialog.cancelText}
              </Button>
              <Button
                variant={dialog.type === 'danger' ? 'destructive' : 'default'}
                onClick={dialog.onConfirm}
              >
                {dialog.confirmText}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </ConfirmDialogContext.Provider>
  )
}

// 使用确认对话框的钩子
export function useConfirm() {
  const context = useContext(ConfirmDialogContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider')
  }
  return context.confirm
} 