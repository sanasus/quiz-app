import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app/tailwind.css'
import './app/i18n'
import { Providers } from './app/providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
)
