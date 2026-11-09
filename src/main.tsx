import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { PermissionProvider } from './context/PermissionContext'

// Initialize i18n (must be imported before App renders)
import './i18n'

// action buttons with their names (Edit, Delete, Revision, ...)
import './components/ActionButtons.css'

// Number boxes change only by typing: the mouse wheel and the up/down arrow keys don't change them
document.addEventListener('wheel', (e) => {
  const el = document.activeElement as HTMLInputElement | null
  // only when scrolling over the focused number box itself (scrolling elsewhere keeps the cursor in it)
  if (el && el.tagName === 'INPUT' && el.type === 'number' && e.target === el) el.blur()
}, { passive: true })
document.addEventListener('keydown', (e) => {
  const el = e.target as HTMLInputElement | null
  if (el && el.tagName === 'INPUT' && el.type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <PermissionProvider>
            <App />
          </PermissionProvider>
        </AuthProvider>
      </BrowserRouter>
  </React.StrictMode>,
)