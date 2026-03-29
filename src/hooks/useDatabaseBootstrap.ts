import { useEffect, useState } from 'react'
import {
  canUseNativeDatabase,
  initializeProfileDatabase,
} from '../lib/database'
import type { DatabaseBootstrapState } from '../types/database'

const initialState: DatabaseBootstrapState = {
  status: 'idle',
  profileId: null,
  databasePath: null,
  tableCount: 0,
  tables: [],
  message: 'Database bootstrap has not started yet.',
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error)
    } catch {
      return 'Database initialization failed with a non-serializable error object.'
    }
  }

  return 'Database initialization failed with an unknown error payload.'
}

export function useDatabaseBootstrap(profileId: string | null) {
  const [state, setState] = useState<DatabaseBootstrapState>(initialState)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!profileId) {
        setState({
          status: 'idle',
          profileId: null,
          databasePath: null,
          tableCount: 0,
          tables: [],
          message: 'Select a profile to initialize its local SQLite database.',
        })
        return
      }

      if (!canUseNativeDatabase()) {
        setState({
          status: 'unsupported',
          profileId: null,
          databasePath: null,
          tableCount: 0,
          tables: [],
          message: 'Run the app with Tauri to initialize and inspect the local SQLite schema.',
        })
        return
      }

      setState({
        status: 'loading',
        profileId,
        databasePath: null,
        tableCount: 0,
        tables: [],
        message: 'Initializing local SQLite schema for the bootstrap profile...',
      })

      try {
        const { databasePath, tables } = await initializeProfileDatabase(profileId)

        if (cancelled) {
          return
        }

        setState({
          status: 'ready',
          profileId,
          databasePath,
          tableCount: tables.length,
          tables,
          message: 'SQLite schema initialized successfully for the current bootstrap profile.',
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          status: 'error',
          profileId,
          databasePath: null,
          tableCount: 0,
          tables: [],
          message: getErrorMessage(error),
        })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [profileId])

  return state
}
