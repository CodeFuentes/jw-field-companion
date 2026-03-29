import { useEffect, useMemo, useState } from 'react'
import { createProfile, deleteProfile, loadProfilesState, selectProfile } from '../lib/profiles'
import type { ProfileRecord, ProfilesStore } from '../types/profile'

type ViewMode = 'loading' | 'selection' | 'onboarding-placeholder' | 'app'

interface ProfilesViewState {
  mode: ViewMode
  store: ProfilesStore | null
  activeProfile: ProfileRecord | null
  pendingProfile: ProfileRecord | null
  error: string | null
}

const emptyStore: ProfilesStore = {
  profiles: [],
  last_active_profile_id: null,
}

function findActiveProfile(store: ProfilesStore) {
  return (
    store.profiles.find((profile) => profile.id === store.last_active_profile_id) ?? null
  )
}

export function useProfilesState() {
  const [state, setState] = useState<ProfilesViewState>({
    mode: 'loading',
    store: null,
    activeProfile: null,
    pendingProfile: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const store = await loadProfilesState()

        if (cancelled) {
          return
        }

        const shouldAutoSelect =
          store.profiles.length === 1 && store.profiles[0]?.pin_hash === null

        if (shouldAutoSelect) {
          const selectedStore = await selectProfile(store.profiles[0].id)

          if (cancelled) {
            return
          }

          setState({
            mode: 'app',
            store: selectedStore,
            activeProfile: findActiveProfile(selectedStore),
            pendingProfile: null,
            error: null,
          })

          return
        }

        setState({
          mode: 'selection',
          store,
          activeProfile: null,
          pendingProfile: null,
          error: null,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          mode: 'selection',
          store: emptyStore,
          activeProfile: null,
          pendingProfile: null,
          error: error instanceof Error ? error.message : 'Failed to load profiles.',
        })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  const selectedProfileId = useMemo(() => {
    return state.activeProfile?.id ?? state.store?.last_active_profile_id ?? null
  }, [state.activeProfile, state.store])

  async function handleCreateProfile(name: string) {
    const store = await createProfile(name)
    const profile = findActiveProfile(store)

    setState({
      mode: 'onboarding-placeholder',
      store,
      activeProfile: profile,
      pendingProfile: profile,
      error: null,
    })
  }

  async function handleSelectProfile(profileId: string) {
    const store = await selectProfile(profileId)

    setState({
      mode: 'app',
      store,
      activeProfile: findActiveProfile(store),
      pendingProfile: null,
      error: null,
    })
  }

  async function handleDeleteProfile(profileId: string) {
    const store = await deleteProfile(profileId)

    setState((currentState) => ({
      mode: 'selection',
      store,
      activeProfile:
        currentState.activeProfile?.id === profileId ? null : currentState.activeProfile,
      pendingProfile: null,
      error: null,
    }))
  }

  function handleContinueFromOnboardingPlaceholder() {
    setState((currentState) => ({
      ...currentState,
      mode: 'app',
      pendingProfile: null,
    }))
  }

  function handleSwitchProfile() {
    setState((currentState) => ({
      ...currentState,
      mode: 'selection',
      activeProfile: null,
      pendingProfile: null,
    }))
  }

  return {
    ...state,
    selectedProfileId,
    handleCreateProfile,
    handleSelectProfile,
    handleDeleteProfile,
    handleContinueFromOnboardingPlaceholder,
    handleSwitchProfile,
  }
}
