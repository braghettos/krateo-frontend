import { ConfigProvider } from 'antd'
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.tsx'
import { antdTheme } from './theme/tokens.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={antdTheme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
