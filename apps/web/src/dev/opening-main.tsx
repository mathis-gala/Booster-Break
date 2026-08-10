import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { LocaleProvider } from '@/features/i18n/LocaleProvider'
import { queryClient } from '@/lib/query-client'
import '@/index.css'
import { OpeningLab } from './OpeningLab'

const root = document.getElementById('opening-lab')

if (!root) {
  throw new Error('Opening lab root is missing')
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <OpeningLab />
      </LocaleProvider>
    </QueryClientProvider>
  </StrictMode>,
)
