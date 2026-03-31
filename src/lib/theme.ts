import type { AppTheme } from '../types/settings'

function getSystemTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(theme: AppTheme) {
  return theme === 'system' ? getSystemTheme() : theme
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = resolveTheme(theme)
}

