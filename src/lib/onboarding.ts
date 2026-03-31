import Database from '@tauri-apps/plugin-sql'
import { invoke } from '@tauri-apps/api/core'
import { createProfileDatabasePath, initializeProfileDatabase } from './database'
import type {
  AppLanguage,
  BackupSetupResult,
  OnboardingStep,
  UserSettingsRecord,
} from '../types/settings'

const CURRENT_TERMS_VERSION = '1.0'

const onboardingDraftPrefix = 'jwfc.onboardingStep.'

function getNowIso() {
  return new Date().toISOString()
}

function normalizeUserSettings(record: UserSettingsRecord): UserSettingsRecord {
  return {
    ...record,
    allow_usage_data: Boolean(record.allow_usage_data),
    auto_sync: Boolean(record.auto_sync),
    backup_enabled: Boolean(record.backup_enabled),
    onboarding_completed: Boolean(record.onboarding_completed),
    backup_directory: record.backup_directory === '' ? null : record.backup_directory,
  }
}

async function loadProfileDatabase(profileId: string) {
  await initializeProfileDatabase(profileId)
  return Database.load(createProfileDatabasePath(profileId))
}

export function detectPreferredLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') {
    return 'es'
  }

  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es'
}

export async function getUserSettings(profileId: string) {
  const database = await loadProfileDatabase(profileId)
  const rows = await database.select<UserSettingsRecord[]>(
    'SELECT * FROM user_settings ORDER BY created_at ASC LIMIT 1',
  )

  return rows[0] ? normalizeUserSettings(rows[0]) : null
}

export async function createInitialUserSettings(profileId: string, language: AppLanguage) {
  const database = await loadProfileDatabase(profileId)
  const now = getNowIso()

  await database.execute(
    `INSERT INTO user_settings (
      id,
      language,
      theme,
      terms_version_accepted,
      allow_usage_data,
      auto_sync,
      backup_enabled,
      backup_directory,
      backup_max_snapshots,
      onboarding_completed,
      created_at,
      updated_at
    ) VALUES (?, ?, 'system', NULL, 0, 0, 1, NULL, 7, 0, ?, ?)`,
    [crypto.randomUUID(), language, now, now],
  )

  return getUserSettings(profileId)
}

export async function updateUserSettings(
  profileId: string,
  patch: Partial<Pick<UserSettingsRecord, 'language' | 'theme' | 'terms_version_accepted' | 'backup_directory' | 'onboarding_completed'>>,
) {
  const existing = await getUserSettings(profileId)
  const settings = existing ?? (await createInitialUserSettings(profileId, detectPreferredLanguage()))
  const next = {
    ...settings,
    ...patch,
    updated_at: getNowIso(),
  }

  const database = await loadProfileDatabase(profileId)

  await database.execute(
    `UPDATE user_settings
     SET language = ?,
         theme = ?,
         terms_version_accepted = ?,
         backup_directory = ?,
         onboarding_completed = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      next.language,
      next.theme,
      next.terms_version_accepted,
      next.backup_directory,
      next.onboarding_completed ? 1 : 0,
      next.updated_at,
      next.id,
    ],
  )

  return getUserSettings(profileId)
}

export function getDraftOnboardingStep(profileId: string): OnboardingStep | null {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(`${onboardingDraftPrefix}${profileId}`)

  if (
    value === 'language' ||
    value === 'terms' ||
    value === 'theme' ||
    value === 'backup' ||
    value === 'ready'
  ) {
    return value
  }

  return null
}

export function setDraftOnboardingStep(profileId: string, step: OnboardingStep) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(`${onboardingDraftPrefix}${profileId}`, step)
}

export function clearDraftOnboardingStep(profileId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(`${onboardingDraftPrefix}${profileId}`)
}

export function deriveOnboardingStep(
  settings: UserSettingsRecord | null,
  draftStep: OnboardingStep | null,
): OnboardingStep {
  if (!settings) {
    return draftStep ?? 'language'
  }

  if (!settings.terms_version_accepted) {
    return draftStep === 'language' ? 'language' : 'terms'
  }

  if (draftStep === 'theme') {
    return 'theme'
  }

  if (settings.backup_directory === null) {
    return draftStep === 'ready' ? 'ready' : 'backup'
  }

  if (!settings.onboarding_completed) {
    return draftStep ?? 'ready'
  }

  return 'ready'
}

export function getTermsVersion() {
  return CURRENT_TERMS_VERSION
}

export async function chooseBackupDirectory(profileId: string) {
  const result = await invoke<BackupSetupResult>('choose_backup_directory', { profileId })
  return result
}
