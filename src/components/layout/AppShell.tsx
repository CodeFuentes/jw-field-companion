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

interface AppShellProps extends PropsWithChildren {
  onSwitchProfile: () => void
  profileName: string | null
}

export function AppShell({ children, onSwitchProfile, profileName }: AppShellProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[var(--background-primary)]">
      <div className="mx-auto flex min-h-screen max-w-[900px]">
        <aside className="hidden w-[200px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--background-secondary)] lg:flex lg:flex-col">
          <div className="border-b border-[var(--border-subtle)] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[var(--purple-500)] text-[12px] font-medium text-white">
                JW
              </div>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {profileName ?? 'Profile'}
              </p>
            </div>
          </div>

          <nav className="flex-1 px-0 py-3">
            {navItems.map(({ key, icon: Icon }) => (
              <button
                key={key}
                className={`flex w-full items-center gap-3 border-r-2 px-4 py-2.5 text-left transition ${
                  key === 'home'
                    ? 'border-[var(--purple-500)] bg-[var(--background-tertiary)] text-[var(--text-primary)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]'
                }`}
                type="button"
              >
                <Icon size={18} />
                <span className="text-[13px]">{t(`navigation.${key}`)}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-[var(--border-subtle)] px-4 py-4">
            <button
              className="text-[13px] text-[var(--text-secondary)] transition hover:text-[var(--purple-700)]"
              onClick={onSwitchProfile}
              type="button"
            >
              {t('profiles.switch')}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--background-primary)] px-5 py-4">
            <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              JW Field Companion
            </p>

            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)]">
              Local-first
            </div>
          </header>

          <main className="flex-1 overflow-auto px-5 py-6 md:px-6 md:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}
