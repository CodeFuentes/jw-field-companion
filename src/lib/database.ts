import Database from '@tauri-apps/plugin-sql'

const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY NOT NULL,
    language TEXT NOT NULL DEFAULT 'es' CHECK (language IN ('es', 'en')),
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    terms_version_accepted TEXT,
    allow_usage_data BOOLEAN NOT NULL DEFAULT 0 CHECK (allow_usage_data IN (0, 1)),
    auto_sync BOOLEAN NOT NULL DEFAULT 0 CHECK (auto_sync IN (0, 1)),
    backup_enabled BOOLEAN NOT NULL DEFAULT 1 CHECK (backup_enabled IN (0, 1)),
    backup_directory TEXT,
    backup_max_snapshots INTEGER NOT NULL DEFAULT 7,
    onboarding_completed BOOLEAN NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS person (
    id UUID PRIMARY KEY NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    latitude REAL,
    longitude REAL,
    interest_status TEXT NOT NULL DEFAULT 'interested' CHECK (interest_status IN ('interested', 'studying', 'paused', 'rejected')),
    archived_at TIMESTAMP,
    first_contact_date DATE,
    created_at TIMESTAMP NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS person_note (
    id UUID PRIMARY KEY NOT NULL,
    person_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (person_id) REFERENCES person (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS visit (
    id UUID PRIMARY KEY NOT NULL,
    person_id UUID NOT NULL,
    date DATE NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'no_answer', 'rejected')),
    counts_as_revisit BOOLEAN NOT NULL CHECK (counts_as_revisit IN (0, 1)),
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (person_id) REFERENCES person (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS study (
    id UUID PRIMARY KEY NOT NULL,
    person_id UUID NOT NULL,
    publication TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (person_id) REFERENCES person (id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS preaching_session (
    id UUID PRIMARY KEY NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    entry_mode TEXT NOT NULL CHECK (entry_mode IN ('realtime', 'manual')),
    modality TEXT NOT NULL DEFAULT 'field' CHECK (modality IN ('field', 'phone', 'letters')),
    notes TEXT,
    created_at TIMESTAMP NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS study_session (
    id UUID PRIMARY KEY NOT NULL,
    study_id UUID NOT NULL,
    preaching_session_id UUID,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,
    companions TEXT,
    chapter_topic TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (study_id) REFERENCES study (id) ON DELETE CASCADE,
    FOREIGN KEY (preaching_session_id) REFERENCES preaching_session (id) ON DELETE SET NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_person_archived_at ON person (archived_at);`,
  `CREATE INDEX IF NOT EXISTS idx_person_name ON person (first_name, last_name);`,
  `CREATE INDEX IF NOT EXISTS idx_person_note_person_created_at ON person_note (person_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_visit_person_date ON visit (person_id, date DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_study_person_status ON study (person_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_study_session_study_started_at ON study_session (study_id, started_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_study_session_preaching_session_id ON study_session (preaching_session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_preaching_session_started_at ON preaching_session (started_at DESC);`,
] as const

interface TableRow {
  name: string
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function createProfileDatabasePath(profileId: string) {
  return `sqlite:${profileId}.db`
}

export async function initializeProfileDatabase(profileId: string) {
  const databasePath = createProfileDatabasePath(profileId)
  const database = await Database.load(databasePath)

  for (const statement of schemaStatements) {
    await database.execute(statement)
  }

  const tables = await database.select<TableRow[]>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
     ORDER BY name ASC`,
  )

  return {
    database,
    databasePath,
    tables: tables.map(({ name }) => name),
  }
}

export function canUseNativeDatabase() {
  return isTauriRuntime()
}
