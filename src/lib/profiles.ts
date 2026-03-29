import { invoke } from '@tauri-apps/api/core'
import type { ProfilesStore } from '../types/profile'

export function loadProfilesState() {
  return invoke<ProfilesStore>('load_profiles_state')
}

export function createProfile(name: string) {
  return invoke<ProfilesStore>('create_profile', { name })
}

export function selectProfile(profileId: string) {
  return invoke<ProfilesStore>('select_profile', { profileId })
}

export function deleteProfile(profileId: string) {
  return invoke<ProfilesStore>('delete_profile', { profileId })
}
