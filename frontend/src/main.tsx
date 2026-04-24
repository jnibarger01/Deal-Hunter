import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppSettingsProvider } from './context/AppSettingsContext'
import { installClientErrorReporting } from './observability'
import './index.css'

installClientErrorReporting({ dsn: import.meta.env.VITE_SENTRY_DSN })

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <App />
    </AppSettingsProvider>
  </React.StrictMode>,
)
