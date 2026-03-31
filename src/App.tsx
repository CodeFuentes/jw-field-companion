import { useEffect } from 'react'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { useProfilesState } from './hooks/useProfilesState'
import { OnboardingPlaceholderPage } from './pages/OnboardingPlaceholderPage'
import { ProfileSelectionPage } from './pages/ProfileSelectionPage'

function App() {
  const {
    mode,
    store,
    activeProfile,
    selectedProfileId,
    error,
    handleCreateProfile,
    handleSelectProfile,
    handleDeleteProfile,
    handleContinueFromOnboardingPlaceholder,
    handleSwitchProfile,
  } = useProfilesState()

  useEffect(() => {
    if (activeProfile) {
      window.localStorage.setItem('jwfc.activeProfileId', activeProfile.id)
      return
    }

    window.localStorage.removeItem('jwfc.activeProfileId')
  }, [activeProfile])

  if (mode === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--background-primary)] px-6 py-10 text-sm text-[var(--text-secondary)]">
        Loading profile state...
      </div>
    )
  }

  if (mode === 'selection') {
    return (
      <ProfileSelectionPage
        error={error}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onSelectProfile={handleSelectProfile}
        profiles={store?.profiles ?? []}
        selectedProfileId={selectedProfileId}
      />
    )
  }

  if (mode === 'onboarding' && activeProfile) {
    return (
      <OnboardingPlaceholderPage
        onContinue={handleContinueFromOnboardingPlaceholder}
        profile={activeProfile}
      />
    )
  }

  return (
    <AppShell onSwitchProfile={handleSwitchProfile} profileName={activeProfile?.name ?? null}>
      <HomePage activeProfileId={activeProfile?.id ?? null} />
    </AppShell>
  )
}

export default App
