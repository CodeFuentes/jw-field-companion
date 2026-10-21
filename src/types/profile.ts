export interface ProfileRecord {
  id: string
  name: string
  db_path: string
  created_at: string
  last_used: string
  pin_hash: string | null
}

export interface ProfilesStore {
  profiles: ProfileRecord[]
  last_active_profile_id: string | null
}
