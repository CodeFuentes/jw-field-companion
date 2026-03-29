use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::{
  fs,
  path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ProfileRecord {
  id: String,
  name: String,
  db_path: String,
  created_at: String,
  last_used: String,
  pin_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct ProfilesStore {
  profiles: Vec<ProfileRecord>,
  last_active_profile_id: Option<String>,
}

fn now_utc_iso() -> String {
  Utc::now().to_rfc3339()
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("Failed to resolve app data dir: {error}"))?;

  fs::create_dir_all(&path)
    .map_err(|error| format!("Failed to create app data dir {}: {error}", path.display()))?;

  Ok(path)
}

fn profiles_json_path(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join("profiles.json"))
}

fn profile_db_path(app: &AppHandle, profile_id: &str) -> Result<PathBuf, String> {
  Ok(app_data_dir(app)?.join(format!("{profile_id}.db")))
}

fn write_profiles_store(app: &AppHandle, store: &ProfilesStore) -> Result<(), String> {
  let path = profiles_json_path(app)?;
  let contents =
    serde_json::to_string_pretty(store).map_err(|error| format!("Failed to serialize profiles.json: {error}"))?;

  fs::write(&path, contents)
    .map_err(|error| format!("Failed to write profiles.json at {}: {error}", path.display()))
}

fn rebuild_profiles_store(app: &AppHandle) -> Result<ProfilesStore, String> {
  let base_dir = app_data_dir(app)?;
  let timestamp = now_utc_iso();
  let mut profiles = Vec::new();

  let entries = fs::read_dir(&base_dir)
    .map_err(|error| format!("Failed to scan app data dir {}: {error}", base_dir.display()))?;

  for entry in entries {
    let entry = entry.map_err(|error| format!("Failed to read app data entry: {error}"))?;
    let path = entry.path();
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
      continue;
    };

    if extension != "db" {
      continue;
    }

    let Some(stem) = path.file_stem().and_then(|value| value.to_str()) else {
      continue;
    };

    if Uuid::parse_str(stem).is_err() {
      continue;
    }

    profiles.push(ProfileRecord {
      id: stem.to_string(),
      name: format!("Recovered {}", &stem[..8]),
      db_path: path.to_string_lossy().to_string(),
      created_at: timestamp.clone(),
      last_used: timestamp.clone(),
      pin_hash: None,
    });
  }

  let store = ProfilesStore {
    profiles,
    last_active_profile_id: None,
  };

  write_profiles_store(app, &store)?;

  Ok(store)
}

fn read_profiles_store(app: &AppHandle) -> Result<ProfilesStore, String> {
  let path = profiles_json_path(app)?;

  if !Path::new(&path).exists() {
    return rebuild_profiles_store(app);
  }

  let contents = fs::read_to_string(&path)
    .map_err(|error| format!("Failed to read profiles.json at {}: {error}", path.display()))?;

  match serde_json::from_str::<ProfilesStore>(&contents) {
    Ok(store) => Ok(store),
    Err(_) => rebuild_profiles_store(app),
  }
}

#[tauri::command]
fn load_profiles_state(app: AppHandle) -> Result<ProfilesStore, String> {
  read_profiles_store(&app)
}

#[tauri::command]
fn create_profile(app: AppHandle, name: String) -> Result<ProfilesStore, String> {
  let trimmed_name = name.trim();

  if trimmed_name.is_empty() {
    return Err("Profile name is required.".into());
  }

  if trimmed_name.chars().count() > 50 {
    return Err("Profile name must be 50 characters or fewer.".into());
  }

  let mut store = read_profiles_store(&app)?;
  let profile_id = Uuid::new_v4().to_string();
  let db_path = profile_db_path(&app, &profile_id)?;
  let timestamp = now_utc_iso();

  fs::File::create(&db_path)
    .map_err(|error| format!("Failed to create database file {}: {error}", db_path.display()))?;

  store.profiles.push(ProfileRecord {
    id: profile_id.clone(),
    name: trimmed_name.to_string(),
    db_path: db_path.to_string_lossy().to_string(),
    created_at: timestamp.clone(),
    last_used: timestamp,
    pin_hash: None,
  });
  store.last_active_profile_id = Some(profile_id);

  write_profiles_store(&app, &store)?;

  Ok(store)
}

#[tauri::command]
fn select_profile(app: AppHandle, profile_id: String) -> Result<ProfilesStore, String> {
  let mut store = read_profiles_store(&app)?;
  let timestamp = now_utc_iso();

  let Some(profile) = store.profiles.iter_mut().find(|profile| profile.id == profile_id) else {
    return Err(format!("Profile {profile_id} was not found."));
  };

  profile.last_used = timestamp;
  store.last_active_profile_id = Some(profile.id.clone());

  write_profiles_store(&app, &store)?;

  Ok(store)
}

#[tauri::command]
fn delete_profile(app: AppHandle, profile_id: String) -> Result<ProfilesStore, String> {
  let mut store = read_profiles_store(&app)?;

  if store.profiles.len() <= 1 {
    return Err("The last remaining profile cannot be deleted.".into());
  }

  let Some(index) = store.profiles.iter().position(|profile| profile.id == profile_id) else {
    return Err(format!("Profile {profile_id} was not found."));
  };

  let profile = store.profiles.remove(index);
  let db_path = PathBuf::from(&profile.db_path);

  if db_path.exists() {
    fs::remove_file(&db_path)
      .map_err(|error| format!("Failed to delete database file {}: {error}", db_path.display()))?;
  }

  if store.last_active_profile_id.as_deref() == Some(profile.id.as_str()) {
    store.last_active_profile_id = None;
  }

  write_profiles_store(&app, &store)?;

  Ok(store)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      load_profiles_state,
      create_profile,
      select_profile,
      delete_profile
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
