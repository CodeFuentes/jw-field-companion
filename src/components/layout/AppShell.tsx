import { BarChart3, BookOpen, ContactRound, Radio, Settings } from 'lucide-react'
import type { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'

const navItems = [
  { key: 'home', icon: BarChart3 },
  { key: 'persons', icon: ContactRound },
  { key: 'ministry', icon: Radio },
  { key: 'studies', icon: BookOpen },
  { key: 'settings', icon: Settings },
] as const

export function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background-secondary)] shadow-[var(--shadow-elevated)]">
        <aside className="hidden w-[240px] shrink-0 flex-col justify-between border-r border-[var(--border-subtle)] bg-[rgba(255,255,255,0.35)] p-5 lg:flex">
          <div className="space-y-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                jw-field-companion
              </p>
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {t('app.name')}
              </h1>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                {t('app.tagline')}
              </p>
            </div>

            <nav className="space-y-2">
              {navItems.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    key === 'home'
                      ? 'border-[var(--purple-200)] bg-[var(--purple-50)] text-[var(--purple-900)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--background-primary)]'
                  }`}
                  type="button"
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{t(`navigation.${key}`)}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--background-primary)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Phase 1
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Offline-first desktop foundation with local SQLite, onboarding, sessions, and reporting.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[rgba(255,255,255,0.55)] px-5 py-4 backdrop-blur md:px-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Desktop app shell
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Setup aligned with the Phase 1 specification.
              </p>
            </div>

            <div className="rounded-full border border-[var(--purple-200)] bg-[var(--purple-50)] px-4 py-2 text-sm font-medium text-[var(--purple-900)]">
              Local-first
            </div>
          </header>

          <main className="flex-1 overflow-auto p-5 md:p-7">{children}</main>
        </div>
      </div>
    </div>
  )
}
