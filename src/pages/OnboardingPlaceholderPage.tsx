import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnboardingFlow } from '../hooks/useOnboardingFlow'
import type { ProfileRecord } from '../types/profile'
import type { AppTheme } from '../types/settings'

interface OnboardingPlaceholderPageProps {
  profile: ProfileRecord
  onContinue: () => void
}

const themeOptions: AppTheme[] = ['light', 'dark', 'system']

export function OnboardingPlaceholderPage({
  profile,
  onContinue,
}: OnboardingPlaceholderPageProps) {
  const { t, i18n } = useTranslation()
  const {
    status,
    currentStep,
    language,
    theme,
    readySummary,
    backupResult,
    termsScrolledToEnd,
    isBusy,
    error,
    setLanguage,
    setTheme,
    setTermsScrolledToEnd,
    persistLanguageAndContinue,
    acceptTermsAndContinue,
    continueToBackup,
    chooseFolder,
    skipBackup,
    completeOnboarding,
    goBack,
  } = useOnboardingFlow(profile.id)

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] px-6 py-10 text-[14px] text-[var(--text-secondary)]">
        Loading onboarding...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background-primary)] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[900px] items-center justify-center">
        <section className="w-full max-w-[480px]">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {t('onboarding.eyebrow')}
          </p>
          <h1 className="mt-3 text-[20px] font-medium text-[var(--text-primary)]">
            {t(`onboarding.${currentStep}.title`, { name: profile.name })}
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-[var(--text-secondary)]">
            {t(`onboarding.${currentStep}.description`, { name: profile.name })}
          </p>

          {error ? (
            <div className="mt-4 rounded-[12px] border border-[rgba(226,75,74,0.22)] bg-[rgba(226,75,74,0.08)] px-4 py-3 text-[13px] text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          {currentStep === 'language' ? (
            <div className="mt-8 flex flex-wrap gap-2">
              {(['es', 'en'] as const).map((value) => {
                const isSelected = language === value

                return (
                  <button
                    key={value}
                    className={`rounded-full border px-4 py-2 text-[13px] transition ${
                      isSelected
                        ? 'border-[var(--purple-200)] bg-[var(--purple-50)] text-[var(--purple-900)]'
                        : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]'
                    }`}
                    onClick={() => {
                      setLanguage(value)
                      void i18n.changeLanguage(value)
                    }}
                    type="button"
                  >
                    {t(`onboarding.language.languages.${value}`)}
                  </button>
                )
              })}
            </div>
          ) : null}

          {currentStep === 'terms' ? (
            <div className="mt-8">
              <div
                className="max-h-[220px] overflow-y-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-4 text-[13px] leading-6 text-[var(--text-secondary)]"
                onScroll={(event) => {
                  const target = event.currentTarget
                  const reachedBottom =
                    target.scrollTop + target.clientHeight >= target.scrollHeight - 4

                  if (reachedBottom) {
                    setTermsScrolledToEnd(true)
                  }
                }}
              >
                <p className="font-medium text-[var(--text-primary)]">
                  {t('onboarding.terms.disclaimerTitle')}
                </p>
                <p className="mt-3">{t('onboarding.terms.disclaimerBody')}</p>
              </div>

              <div className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-tertiary)]">
                <Info size={14} />
                <span>{t('onboarding.terms.scrollHint')}</span>
              </div>
            </div>
          ) : null}

          {currentStep === 'theme' ? (
            <div className="mt-8 grid grid-cols-3 gap-2">
              {themeOptions.map((value) => {
                const isSelected = theme === value

                return (
                  <button
                    key={value}
                    className={`rounded-[12px] border px-3 py-4 text-center text-[13px] transition ${
                      isSelected
                        ? 'border-[var(--purple-200)] bg-[var(--purple-50)] text-[var(--purple-900)]'
                        : 'border-[var(--border-subtle)] bg-[var(--background-elevated)] text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)]'
                    }`}
                    onClick={() => void setTheme(value)}
                    type="button"
                  >
                    {t(`onboarding.theme.options.${value}`)}
                  </button>
                )
              })}
            </div>
          ) : null}

          {currentStep === 'backup' ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] p-4 text-[13px] leading-6 text-[var(--text-secondary)]">
                {t('onboarding.backup.note')}
              </div>

              <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
                {backupResult?.selectedPath ?? t('onboarding.backup.notConfigured')}
              </div>

              {backupResult?.snapshotPath ? (
                <p className="text-[12px] text-[var(--success)]">
                  {t('onboarding.backup.confirmation', { path: backupResult.snapshotPath })}
                </p>
              ) : null}
            </div>
          ) : null}

          {currentStep === 'ready' ? (
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between rounded-[12px] bg-[var(--background-elevated)] px-4 py-3 text-[13px]">
                <span className="text-[var(--text-secondary)]">{t('onboarding.ready.summary.language')}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {t(`onboarding.language.languages.${readySummary.language}`)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-[var(--background-elevated)] px-4 py-3 text-[13px]">
                <span className="text-[var(--text-secondary)]">{t('onboarding.ready.summary.theme')}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {t(`onboarding.theme.options.${readySummary.theme}`)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[12px] bg-[var(--background-elevated)] px-4 py-3 text-[13px]">
                <span className="text-[var(--text-secondary)]">{t('onboarding.ready.summary.backup')}</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {readySummary.backup
                    ? t('onboarding.ready.summary.personal')
                    : t('onboarding.ready.summary.system')}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            {currentStep !== 'language' ? (
              <button
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--background-tertiary)]"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft size={14} />
                <span>{t('onboarding.actions.back')}</span>
              </button>
            ) : (
              <span />
            )}

            {currentStep === 'language' ? (
              <button
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)] disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                disabled={isBusy}
                onClick={() => void persistLanguageAndContinue()}
                type="button"
              >
                <span>{t('onboarding.actions.continue')}</span>
                <ArrowRight size={14} />
              </button>
            ) : null}

            {currentStep === 'terms' ? (
              <button
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)] disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                disabled={isBusy || !termsScrolledToEnd}
                onClick={() => void acceptTermsAndContinue()}
                type="button"
              >
                <span>{t('onboarding.terms.accept')}</span>
                <ArrowRight size={14} />
              </button>
            ) : null}

            {currentStep === 'theme' ? (
              <button
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)]"
                onClick={continueToBackup}
                type="button"
              >
                <span>{t('onboarding.actions.continue')}</span>
                <ArrowRight size={14} />
              </button>
            ) : null}

            {currentStep === 'backup' ? (
              <div className="flex items-center gap-2">
                <button
                  className="rounded-[8px] border border-[var(--border-subtle)] px-3 py-2 text-[13px] text-[var(--text-secondary)] transition hover:bg-[var(--background-tertiary)]"
                  onClick={() => void skipBackup()}
                  type="button"
                >
                  {t('onboarding.backup.skip')}
                </button>
                <button
                  className="rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)] disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                  disabled={isBusy}
                  onClick={() => void chooseFolder()}
                  type="button"
                >
                  {t('onboarding.backup.choose')}
                </button>
              </div>
            ) : null}

            {currentStep === 'ready' ? (
              <button
                className="inline-flex items-center gap-2 rounded-[8px] bg-[var(--purple-500)] px-3 py-2 text-[13px] text-white transition hover:bg-[var(--purple-400)] active:bg-[var(--purple-700)] disabled:cursor-not-allowed disabled:bg-[var(--background-tertiary)] disabled:text-[var(--text-tertiary)]"
                disabled={isBusy}
                onClick={async () => {
                  const settings = await completeOnboarding()

                  if (settings) {
                    onContinue()
                  }
                }}
                type="button"
              >
                <Check size={14} />
                <span>{t('onboarding.ready.action')}</span>
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
