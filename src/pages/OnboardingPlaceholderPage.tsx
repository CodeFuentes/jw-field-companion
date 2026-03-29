import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ProfileRecord } from '../types/profile'

interface OnboardingPlaceholderPageProps {
  profile: ProfileRecord
  onContinue: () => void
}

export function OnboardingPlaceholderPage({
  profile,
  onContinue,
}: OnboardingPlaceholderPageProps) {
  const { t, i18n } = useTranslation()
  const selectedLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'es'

  return (
    <div className="min-h-screen bg-[var(--background-primary)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[900px] items-center justify-center">
        <section className="w-full max-w-[420px]">
          <div className="flex gap-2">
            <span className="h-2 w-6 rounded-full bg-[var(--purple-500)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
            <span className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />
          </div>

          <p className="mt-8 text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t('onboardingPlaceholder.eyebrow')}
          </p>
          <h1 className="mt-3 text-[20px] font-medium text-[var(--text-primary)]">
            {t('onboardingPlaceholder.title', { name: profile.name })}
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
            {t('onboardingPlaceholder.description')}
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {(['es', 'en'] as const).map((language) => {
              const isSelected = selectedLanguage === language

              return (
                <button
                  key={language}
                  className={`rounded-full border px-4 py-2 text-[13px] transition ${
                    isSelected
                      ? 'border-[var(--purple-200)] bg-[var(--purple-50)] text-[var(--purple-900)]'
                      : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]'
                  }`}
                  onClick={() => void i18n.changeLanguage(language)}
                  type="button"
                >
                  {t(`onboardingPlaceholder.languages.${language}`)}
                </button>
              )
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)]"
              onClick={onContinue}
              type="button"
            >
              <span>{t('onboardingPlaceholder.continue')}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
