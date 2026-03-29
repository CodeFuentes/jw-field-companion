import { Database, Languages, ShieldCheck, TimerReset } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const setupItems = [
  {
    icon: Database,
    titleKey: 'home.cards.sqlite.title',
    descriptionKey: 'home.cards.sqlite.description',
  },
  {
    icon: Languages,
    titleKey: 'home.cards.i18n.title',
    descriptionKey: 'home.cards.i18n.description',
  },
  {
    icon: TimerReset,
    titleKey: 'home.cards.flows.title',
    descriptionKey: 'home.cards.flows.description',
  },
  {
    icon: ShieldCheck,
    titleKey: 'home.cards.backup.title',
    descriptionKey: 'home.cards.backup.description',
  },
] as const

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {t('home.hero.eyebrow')}
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-[var(--text-primary)] md:text-4xl">
            {t('home.hero.title')}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
            {t('home.hero.description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <div className="rounded-full bg-[var(--purple-500)] px-4 py-2 text-sm font-medium text-white">
              React + TypeScript
            </div>
            <div className="rounded-full border border-[var(--purple-200)] bg-[var(--purple-50)] px-4 py-2 text-sm font-medium text-[var(--purple-900)]">
              Tauri + SQLite
            </div>
            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--background-primary)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
              i18next + Tailwind
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[linear-gradient(180deg,rgba(91,79,207,0.92),rgba(67,56,168,1))] p-7 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
            {t('home.checklist.eyebrow')}
          </p>
          <h3 className="mt-4 text-2xl font-semibold">{t('home.checklist.title')}</h3>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-white/88">
            <li>{t('home.checklist.items.scaffold')}</li>
            <li>{t('home.checklist.items.structure')}</li>
            <li>{t('home.checklist.items.i18n')}</li>
            <li>{t('home.checklist.items.tauri')}</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {setupItems.map(({ icon: Icon, titleKey, descriptionKey }) => (
          <article
            key={titleKey}
            className="rounded-[24px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.72)] p-5"
          >
            <div className="inline-flex rounded-2xl bg-[var(--purple-50)] p-3 text-[var(--purple-700)]">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
              {t(titleKey)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t(descriptionKey)}
            </p>
          </article>
        ))}
      </section>
    </div>
  )
}
