import { useState } from 'react'
import {
  ArrowRightLeftIcon,
  BookOpenIcon,
  GalleryHorizontalEndIcon,
  MenuIcon,
  SparklesIcon,
  PackageOpenIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'

import type { DashboardTab, NavItem } from '../types'
import { AuthNavCard } from './AuthNavCard'
import { LanguageSelector } from './LanguageSelector'
import { NavButton } from './NavButton'

interface GameNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  auth?: AuthMeResponse
  authIsPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
}

export function GameNav({
  activeTab,
  onTabChange,
  auth,
  authIsPending,
  onLogout,
  isLoggingOut,
}: GameNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  function selectTab(tab: DashboardTab) {
    onTabChange(tab)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between bg-sidebar bg-[radial-gradient(circle_at_1px_1px,oklch(0.985_0.004_250_/_16%)_1px,transparent_0)] bg-[length:12px_12px] px-4 text-sidebar-foreground md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg">
            <img src={appIconUrl} alt="" className="size-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-black tracking-normal">{m.app_name()}</p>
            <p className="text-xs font-medium text-sidebar-foreground/72">{m.app_subtitle()}</p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-game-menu"
          aria-label={isMobileMenuOpen ? m.menu_close() : m.menu_open()}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          {isMobileMenuOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        </button>
      </header>

      {isMobileMenuOpen ? (
        <nav
          id="mobile-game-menu"
          aria-label={m.nav_aria()}
          className="fixed inset-x-0 top-16 z-30 grid gap-2 bg-sidebar bg-[radial-gradient(circle_at_1px_1px,oklch(0.985_0.004_250_/_16%)_1px,transparent_0)] bg-[length:12px_12px] px-4 pb-4 text-sidebar-foreground md:hidden"
        >
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              isActive={activeTab === item.id}
              isDisabled={item.disabled}
              label={getNavLabel(item.id)}
              size="mobile"
              onSelect={() => selectTab(item.id)}
            />
          ))}

          <LanguageSelector className="mt-1" />
          <AuthNavCard
            key={auth?.authenticated ? 'mobile-authenticated' : 'mobile-guest'}
            auth={auth}
            isPending={authIsPending}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            className="mt-1"
          />
        </nav>
      ) : null}

      <nav
        aria-label={m.nav_aria()}
        className="fixed inset-y-0 left-0 z-20 hidden w-44 flex-col bg-sidebar bg-[radial-gradient(circle_at_1px_1px,oklch(0.985_0.004_250_/_16%)_1px,transparent_0)] bg-[length:12px_12px] px-3 py-3 text-sidebar-foreground md:flex"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg">
            <img src={appIconUrl} alt="" className="size-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-black tracking-normal">{m.app_name()}</p>
            <p className="text-xs font-medium text-sidebar-foreground/72">{m.app_subtitle()}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              isActive={activeTab === item.id}
              isDisabled={item.disabled}
              label={getNavLabel(item.id)}
              size="desktop"
              onSelect={() => selectTab(item.id)}
            />
          ))}
        </div>

        <LanguageSelector className="mb-2" />
        <AuthNavCard
          key={auth?.authenticated ? 'desktop-authenticated' : 'desktop-guest'}
          auth={auth}
          isPending={authIsPending}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </nav>
    </>
  )
}

const appIconUrl = `${import.meta.env.BASE_URL}cards.png`

const navItems: NavItem[] = [
  { id: 'packs', icon: PackageOpenIcon },
  { id: 'sandbox', icon: SparklesIcon },
  { id: 'collection', icon: BookOpenIcon },
  { id: 'boards', icon: GalleryHorizontalEndIcon, disabled: true },
  { id: 'trade', icon: ArrowRightLeftIcon },
  { id: 'leaders', icon: TrophyIcon, disabled: true },
]

const getNavLabel = (tab: DashboardTab): string => {
  switch (tab) {
    case 'packs':
      return m.nav_packs()
    case 'sandbox':
      return m.nav_sandbox()
    case 'collection':
      return m.nav_collection()
    case 'boards':
      return m.nav_boards()
    case 'trade':
      return m.nav_trade()
    case 'leaders':
      return m.nav_leaders()
  }
}
