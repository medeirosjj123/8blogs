import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to debug API call issues
  // <StrictMode>
    <App />
  // </StrictMode>,
)
