import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import { ThemeModeProvider } from './context/ThemeModeContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <App />
    </ThemeModeProvider>
  </React.StrictMode>
)
