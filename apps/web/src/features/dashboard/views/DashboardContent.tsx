import type { DashboardTab } from '../types'
import { CollectionView } from './CollectionView'
import { PacksView } from './PacksView'
import { TradeView } from '../../trade/views/TradeView'

interface DashboardContentProps {
  activeTab: DashboardTab
}

export function DashboardContent(props: DashboardContentProps) {
  switch (props.activeTab) {
    case 'packs':
      return <PacksView />
    case 'collection':
      return <CollectionView />
    case 'trade':
      return <TradeView />
    default:
      return <PacksView />
  }
}
