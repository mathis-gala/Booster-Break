import type { LucideIcon } from 'lucide-react'

export type DashboardTab = 'packs' | 'sandbox' | 'collection' | 'boards' | 'trade' | 'leaders'

export interface NavItem {
  id: DashboardTab
  icon: LucideIcon
  disabled?: boolean
}
