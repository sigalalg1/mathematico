import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import './i18n'
import './index.css'
import './styles/buttons.css'
import './styles/primitives.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerServiceWorker'

void registerServiceWorker().catch((error: unknown) => {
  console.warn('[Mathletica] Service worker registration failed.', error)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
