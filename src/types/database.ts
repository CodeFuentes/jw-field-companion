export interface DatabaseBootstrapState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'
  profileId: string | null
  databasePath: string | null
  tableCount: number
  tables: string[]
  message: string
}
