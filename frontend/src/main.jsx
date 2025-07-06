import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ConfirmDialogProvider } from './components/ui/confirm-dialog.jsx'
import { ToastProvider } from './components/ui/toast.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </ToastProvider>
  </React.StrictMode>,
) 