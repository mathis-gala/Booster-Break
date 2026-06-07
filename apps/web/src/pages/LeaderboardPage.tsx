import { GameNav } from '@/features/dashboard/components/GameNav'
import { LeaderboardHeader } from '@/features/leaderboard/components/LeaderboardHeader'
import { LeaderboardPanel } from '@/features/leaderboard/components/LeaderboardPanel'
import { useLeaderboardPage } from '@/features/leaderboard/hooks/useLeaderboardPage'
import { m } from '@/paraglide/messages'

export function LeaderboardPage() {
  const {
    activeConfig,
    activeLeaderboard,
    auth,
    leaderboard,
    logoutMutation,
    numberFormatter,
    players,
    selectTab,
    setActiveLeaderboard,
  } = useLeaderboardPage()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sidebar focus:px-4 focus:py-3 focus:text-sidebar-foreground"
      >
        {m.skip_to_main_content()}
      </a>

      <GameNav
        activeTab="leaders"
        onTabChange={selectTab}
        auth={auth.data}
        authIsPending={auth.isPending}
        onLogout={() => logoutMutation.mutate()}
        isLoggingOut={logoutMutation.isPending}
      />

      <main id="main-content" className="min-h-dvh min-w-0 pt-16 md:pl-44 md:pt-0">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl px-3 py-5 sm:px-6 md:min-h-dvh lg:px-8">
          <section className="mx-auto flex w-full max-w-4xl flex-col gap-4">
            <LeaderboardHeader />

            {leaderboard.error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive">
                {m.leaderboard_load_error()}
              </div>
            ) : (
              <LeaderboardPanel
                title={activeConfig.title}
                description={activeConfig.description}
                scoreLabel={activeConfig.scoreLabel}
                icon={activeConfig.icon}
                players={players}
                isPending={leaderboard.isPending}
                getScore={activeConfig.getScore}
                numberFormatter={numberFormatter}
                activeLeaderboard={activeLeaderboard}
                onLeaderboardChange={setActiveLeaderboard}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
