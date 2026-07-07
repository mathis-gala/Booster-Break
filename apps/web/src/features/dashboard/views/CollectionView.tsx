import { useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpenIcon, RecycleIcon } from 'lucide-react'
import type { CollectionSort } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import { CollectionRecyclePanel } from '../../recycle/components/CollectionRecyclePanel'
import type { RecycleSelection } from '../../recycle/lib/recycle-utils'
import { useLocale } from '@/features/i18n/useLocale'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { useBrowseCollection } from '../hooks/useBrowseCollection'

type CollectionMode = 'browse' | 'recycle'

interface CollectionModeToggleProps {
  mode: CollectionMode
  onChange: (mode: CollectionMode) => void
}

interface ModeButtonProps {
  isActive: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}

export function CollectionView() {
  useLocale()
  const [mode, setMode] = useState<CollectionMode>('browse')
  const browse = useBrowseCollection(mode === 'browse')
  const [recyclePage, setRecyclePage] = useState(1)
  const [recycleSort, setRecycleSort] = useState<CollectionSort>('recent')
  const [recycleSearchQuery, setRecycleSearchQuery] = useState('')
  const [recycleSelection, setRecycleSelection] = useState<RecycleSelection>({})

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <CollectionModeToggle mode={mode} onChange={setMode} />

      {mode === 'recycle' ? (
        <div className="flex w-full justify-center">
          <CollectionRecyclePanel
            page={recyclePage}
            sort={recycleSort}
            searchQuery={recycleSearchQuery}
            selection={recycleSelection}
            onPageChange={setRecyclePage}
            onSortChange={setRecycleSort}
            onSearchChange={setRecycleSearchQuery}
            onSelectionChange={setRecycleSelection}
          />
        </div>
      ) : (
        <div className="flex w-full justify-center">
          <CollectionPanel
            cards={browse.cards}
            isPending={browse.isPending}
            fitContent
            page={browse.page}
            pageCount={browse.pageCount}
            total={browse.total}
            totalCards={browse.totalCards}
            sort={browse.sort}
            searchQuery={browse.searchQuery}
            sets={browse.sets}
            selectedSetId={browse.selectedSetId}
            onSortChange={browse.onSortChange}
            onSearchChange={browse.onSearchChange}
            onSetChange={browse.onSetChange}
            onPageChange={browse.onPageChange}
          />
        </div>
      )}
    </div>
  )
}

function CollectionModeToggle({ mode, onChange }: CollectionModeToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-border bg-background p-1">
      <ModeButton
        isActive={mode === 'browse'}
        icon={<BookOpenIcon className="size-4" aria-hidden="true" />}
        label={m.nav_collection()}
        onClick={() => onChange('browse')}
      />
      <ModeButton
        isActive={mode === 'recycle'}
        icon={<RecycleIcon className="size-4" aria-hidden="true" />}
        label={m.nav_recycle()}
        onClick={() => onChange('recycle')}
      />
    </div>
  )
}

function ModeButton({ isActive, icon, label, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-sidebar text-sidebar-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}
