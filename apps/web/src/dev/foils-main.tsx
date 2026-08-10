import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/index.css'
import { FoilLab } from './FoilLab'
import './foils.css'

const root = document.getElementById('foil-lab')

if (!root) {
  throw new Error('Foil lab root is missing')
}

createRoot(root).render(
  <StrictMode>
    <FoilLab />
  </StrictMode>,
)
