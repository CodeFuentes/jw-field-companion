import { useEffect, useMemo, useState } from 'react'
import {
  chooseBackupDirectory,
  clearDraftOnboardingStep,
  createInitialUserSettings,
  deriveOnboardingStep,
  detectPreferredLanguage,
  getDraftOnboardingStep,
  getTermsVersion,
  getUserSettings,
  setDraftOnboardingStep,
  updateUserSettings,
} from '../lib/onboarding'
import { applyTheme } from '../lib/theme'
import type {
  AppLanguage,
  AppTheme,
  BackupSetupResult,
  OnboardingStep,
  UserSettingsRecord,
} from '../types/settings'

interface OnboardingFlowState {
  status: 'loading' | 'ready'
  currentStep: OnboardingStep
  language: AppLanguage
  theme: AppTheme
  settings: UserSettingsRecord | null
  backupResult: BackupSetupResult | null
  termsAccepted: boolean
  termsScrolledToEnd: boolean
  isBusy: boolean
  error: string | null
}

const initialState: OnboardingFlowState = {
  status: 'loading',
  currentStep: 'language',
  language: detectPreferredLanguage(),
  theme: 'system',
  settings: null,
  backupResult: null,
  termsAccepted: false,
  termsScrolledToEnd: false,
  isBusy: false,
  error: null,
}

export function useOnboardingFlow(profileId: string) {
  const [state, setState] = useState<OnboardingFlowState>(initialState)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const settings = await getUserSettings(profileId)

      if (cancelled) {
        return
      }

      const draftStep = getDraftOnboardingStep(profileId)
      const currentStep = deriveOnboardingStep(settings, draftStep)
      const language = settings?.language ?? detectPreferredLanguage()
      const theme = settings?.theme ?? 'system'

      applyTheme(theme)

      setState({
        status: 'ready',
        currentStep,
        language,
        theme,
        settings,
        backupResult: null,
        termsAccepted: Boolean(settings?.terms_version_accepted),
        termsScrolledToEnd: Boolean(settings?.terms_version_accepted),
        isBusy: false,
        error: null,
      })
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [profileId])

  const readySummary = useMemo(() => {
    return {
      language: state.language,
      theme: state.theme,
      backup:
        state.settings?.backup_directory ??
        state.backupResult?.selectedPath ??
        null,
    }
  }, [state.backupResult, state.language, state.settings?.backup_directory, state.theme])

  async function persistLanguageAndContinue() {
    setState((current) => ({ ...current, isBusy: true, error: null }))

    try {
      const settings =
        (await updateUserSettings(profileId, { language: state.language })) ??
        (await createInitialUserSettings(profileId, state.language))

      setDraftOnboardingStep(profileId, 'terms')

      setState((current) => ({
        ...current,
        currentStep: 'terms',
        settings,
        isBusy: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : 'Failed to save the language step.',
      }))
    }
  }

  async function acceptTermsAndContinue() {
    setState((current) => ({ ...current, isBusy: true, error: null }))

    try {
      const settings = await updateUserSettings(profileId, {
        language: state.language,
        terms_version_accepted: getTermsVersion(),
      })

      setDraftOnboardingStep(profileId, 'theme')

      setState((current) => ({
        ...current,
        currentStep: 'theme',
        settings,
        termsAccepted: true,
        isBusy: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : 'Failed to accept the terms.',
      }))
    }
  }

  async function setTheme(theme: AppTheme) {
    applyTheme(theme)
    setState((current) => ({ ...current, theme }))

    const settings = await updateUserSettings(profileId, { theme })

    setState((current) => ({
      ...current,
      settings,
    }))
  }

  function continueToBackup() {
    setDraftOnboardingStep(profileId, 'backup')
    setState((current) => ({ ...current, currentStep: 'backup' }))
  }

  async function chooseFolder() {
    setState((current) => ({ ...current, isBusy: true, error: null }))

    try {
      const backupResult = await chooseBackupDirectory(profileId)

      if (!backupResult.selectedPath) {
        setState((current) => ({ ...current, isBusy: false }))
        return
      }

      const settings = await updateUserSettings(profileId, {
        backup_directory: backupResult.selectedPath,
      })

      setDraftOnboardingStep(profileId, 'ready')

      setState((current) => ({
        ...current,
        backupResult,
        settings,
        currentStep: 'ready',
        isBusy: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : 'Failed to configure the backup directory.',
      }))
    }
  }

  async function skipBackup() {
    setState((current) => ({ ...current, isBusy: true, error: null }))

    try {
      const settings = await updateUserSettings(profileId, {
        backup_directory: '',
      })

      setDraftOnboardingStep(profileId, 'ready')

      setState((current) => ({
        ...current,
        settings,
        currentStep: 'ready',
        isBusy: false,
      }))
    } catch (error) {
      setState((current) => ({
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : 'Failed to skip backup setup.',
      }))
    }
  }

  async function completeOnboarding() {
    setState((current) => ({ ...current, isBusy: true, error: null }))

    try {
      const settings = await updateUserSettings(profileId, {
        onboarding_completed: true,
      })

      clearDraftOnboardingStep(profileId)

      setState((current) => ({
        ...current,
        settings,
        isBusy: false,
      }))

      return settings
    } catch (error) {
      setState((current) => ({
        ...current,
        isBusy: false,
        error: error instanceof Error ? error.message : 'Failed to complete onboarding.',
      }))

      return null
    }
  }

  function goBack() {
    setState((current) => {
      const previousStep =
        current.currentStep === 'terms'
          ? 'language'
          : current.currentStep === 'theme'
            ? 'terms'
            : current.currentStep === 'backup'
              ? 'theme'
              : 'backup'

      setDraftOnboardingStep(profileId, previousStep)

      return {
        ...current,
        currentStep: previousStep,
      }
    })
  }

  return {
    ...state,
    readySummary,
    setLanguage: (language: AppLanguage) => setState((current) => ({ ...current, language })),
    setTheme,
    setTermsScrolledToEnd: (value: boolean) =>
      setState((current) => ({ ...current, termsScrolledToEnd: value })),
    persistLanguageAndContinue,
    acceptTermsAndContinue,
    continueToBackup,
    chooseFolder,
    skipBackup,
    completeOnboarding,
    goBack,
  }
}
