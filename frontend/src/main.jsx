import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ConfirmDialogProvider } from './components/ui/confirm-dialog.jsx'
import { ToastProvider } from './components/ui/toast.jsx'
import './index.css'

// 全局过滤 ReactQuill 的弃用警告
if (typeof window !== 'undefined') {
  const originalWarn = console.warn
  const originalError = console.error
  
  console.warn = (...args) => {
    const message = args[0]
    if (message && typeof message === 'string') {
      if (message.includes('DOMNodeInserted') || 
          message.includes('mutation event') ||
          message.includes('findDOMNode is deprecated') ||
          message.includes('Listener added for a \'DOMNodeInserted\' mutation event')) {
        return // 忽略 ReactQuill 相关的弃用警告
      }
    }
    originalWarn.apply(console, args)
  }
  
  console.error = (...args) => {
    const message = args[0]
    if (message && typeof message === 'string') {
      if (message.includes('DOMNodeInserted') || 
          message.includes('mutation event') ||
          message.includes('findDOMNode is deprecated')) {
        return // 忽略 ReactQuill 相关的弃用错误
      }
    }
    originalError.apply(console, args)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </ToastProvider>
) 