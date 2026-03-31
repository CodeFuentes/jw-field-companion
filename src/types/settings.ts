export type AppLanguage = 'es' | 'en'

export type AppTheme = 'light' | 'dark' | 'system'

export type OnboardingStep = 'language' | 'terms' | 'theme' | 'backup' | 'ready'

export interface UserSettingsRecord {
  id: string
  language: AppLanguage
  theme: AppTheme
  terms_version_accepted: string | null
  allow_usage_data: boolean
  auto_sync: boolean
  backup_enabled: boolean
  backup_directory: string | null
  backup_max_snapshots: number
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface BackupSetupResult {
  selectedPath: string | null
  snapshotPath: string | null
}
