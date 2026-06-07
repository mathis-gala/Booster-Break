import type { DashboardTab } from '../types'
import { CollectionView } from './CollectionView'
import { PacksView } from './PacksView'
import { SandboxView } from './SandboxView'
import { RecycleView } from '../../recycle/views/RecycleView'
import { TradeView } from '../../trade/views/TradeView'

interface DashboardContentProps {
  activeTab: DashboardTab
}

export function DashboardContent(props: DashboardContentProps) {
  switch (props.activeTab) {
    case 'packs':
      return <PacksView />
    case 'sandbox':
      return <SandboxView />
    case 'collection':
      return <CollectionView />
    case 'recycle':
      return <RecycleView />
    case 'trade':
      return <TradeView />
    default:
      return <PacksView />
  }
}
