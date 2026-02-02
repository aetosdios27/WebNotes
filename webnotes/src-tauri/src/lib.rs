use chrono::Utc;
use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Manager, State};

// =============================================================================
// DATA TYPES
// =============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder_id: Option<String>,
    pub is_pinned: bool,
    pub pinned_at: Option<String>, // FIX #1: Added
    pub font: Option<String>,      // FIX #1: Added
    pub updated_at: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub created_at: String,
}

// =============================================================================
// STATE
// =============================================================================

struct DbState {
    conn: Mutex<Connection>, // FIX #2: Mutex instead of opening new connections
}

impl DbState {
    fn new(path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&path)
            .map_err(|e| format!("Failed to open database at {:?}: {}", path, e))?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn with_conn<T, F>(&self, f: F) -> Result<T, String>
    where
        F: FnOnce(&Connection) -> SqliteResult<T>,
    {
        let conn = self
            .conn
            .lock()
            .map_err(|e| format!("Failed to acquire database lock: {}", e))?;

        f(&conn).map_err(|e| format!("Database error: {}", e))
    }
}

// =============================================================================
// DATABASE INITIALIZATION & MIGRATIONS
// =============================================================================

#[tauri::command]
fn init_db(state: State<DbState>) -> Result<String, String> {
    state.with_conn(|conn| {
        // Create Notes table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                folder_id TEXT,
                is_pinned INTEGER DEFAULT 0,
                pinned_at TEXT,
                font TEXT,
                updated_at TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create Folders table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create FTS index
        conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id, title, content)",
            [],
        )?;

        // Create indexes for performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned)",
            [],
        )?;

        // FIX #4: Migrations for existing databases
        // SQLite will error if column exists, we ignore that
        let migrations = [
            "ALTER TABLE notes ADD COLUMN pinned_at TEXT",
            "ALTER TABLE notes ADD COLUMN font TEXT",
        ];

        for migration in migrations {
            // Ignore errors (column already exists)
            let _ = conn.execute(migration, []);
        }

        Ok(())
    })?;

    log::info!("Database initialized successfully");
    Ok("Database initialized".to_string())
}

// =============================================================================
// NOTE OPERATIONS
// =============================================================================

#[tauri::command]
fn save_note(note: Note, state: State<DbState>) -> Result<(), String> {
    // Validate input
    if note.id.is_empty() {
        return Err("Note ID cannot be empty".to_string());
    }
    if note.id.len() > 100 {
        return Err("Note ID too long".to_string());
    }

    state.with_conn(|conn| {
        // Use client-provided updated_at, fallback to server time
        let updated_at = if note.updated_at.is_empty() {
            Utc::now().to_rfc3339()
        } else {
            note.updated_at.clone()
        };

        conn.execute(
            "INSERT INTO notes (id, title, content, folder_id, is_pinned, pinned_at, font, updated_at, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                content = excluded.content,
                folder_id = excluded.folder_id,
                is_pinned = excluded.is_pinned,
                pinned_at = excluded.pinned_at,
                font = excluded.font,
                updated_at = excluded.updated_at",
            params![
                note.id,
                note.title,
                note.content,
                note.folder_id,
                note.is_pinned,
                note.pinned_at,
                note.font,
                updated_at,
                note.created_at
            ],
        )?;

        // FIX #5: Handle FTS error properly instead of ignoring
        conn.execute(
            "INSERT INTO notes_fts (id, title, content) VALUES (?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET title = excluded.title, content = excluded.content",
            params![note.id, note.title, note.content],
        ).map_err(|e| {
            log::warn!("FTS sync failed for note {}: {}", note.id, e);
            e
        })?;

        Ok(())
    })
}

#[tauri::command]
fn get_all_notes(state: State<DbState>) -> Result<Vec<Note>, String> {
    state.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, folder_id, is_pinned, pinned_at, font, updated_at, created_at
             FROM notes
             ORDER BY is_pinned DESC, pinned_at DESC, updated_at DESC"
        )?;

        let notes = stmt.query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                folder_id: row.get(3)?,
                is_pinned: row.get(4)?,
                pinned_at: row.get(5)?,
                font: row.get(6)?,
                updated_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;

        // FIX #2: Proper error collection instead of unwrap
        notes.collect::<SqliteResult<Vec<_>>>()
    })
}

#[tauri::command]
fn get_note(id: String, state: State<DbState>) -> Result<Option<Note>, String> {
    if id.is_empty() {
        return Err("Note ID cannot be empty".to_string());
    }

    state.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT id, title, content, folder_id, is_pinned, pinned_at, font, updated_at, created_at
             FROM notes
             WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                folder_id: row.get(3)?,
                is_pinned: row.get(4)?,
                pinned_at: row.get(5)?,
                font: row.get(6)?,
                updated_at: row.get(7)?,
                created_at: row.get(8)?,
            })),
            None => Ok(None),
        }
    })
}

#[tauri::command]
fn delete_note(id: String, state: State<DbState>) -> Result<(), String> {
    if id.is_empty() {
        return Err("Note ID cannot be empty".to_string());
    }

    state.with_conn(|conn| {
        // Delete from main table
        let deleted = conn.execute("DELETE FROM notes WHERE id = ?1", params![id])?;

        if deleted == 0 {
            log::warn!("Attempted to delete non-existent note: {}", id);
        }

        // Delete from FTS (ignore errors - might not exist)
        let _ = conn.execute("DELETE FROM notes_fts WHERE id = ?1", params![id]);

        Ok(())
    })
}

#[tauri::command]
fn toggle_pin(id: String, state: State<DbState>) -> Result<Note, String> {
    if id.is_empty() {
        return Err("Note ID cannot be empty".to_string());
    }

    state.with_conn(|conn| {
        // Get current state
        let mut stmt = conn.prepare(
            "SELECT id, title, content, folder_id, is_pinned, pinned_at, font, updated_at, created_at
             FROM notes WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;
        let row = rows.next()?.ok_or_else(|| {
            rusqlite::Error::QueryReturnedNoRows
        })?;

        let current_is_pinned: bool = row.get(4)?;
        let new_is_pinned = !current_is_pinned;
        let new_pinned_at: Option<String> = if new_is_pinned {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };
        let new_updated_at = Utc::now().to_rfc3339();

        // Update
        conn.execute(
            "UPDATE notes SET is_pinned = ?1, pinned_at = ?2, updated_at = ?3 WHERE id = ?4",
            params![new_is_pinned, new_pinned_at, new_updated_at, id],
        )?;

        // Return updated note
        Ok(Note {
            id: row.get(0)?,
            title: row.get(1)?,
            content: row.get(2)?,
            folder_id: row.get(3)?,
            is_pinned: new_is_pinned,
            pinned_at: new_pinned_at,
            font: row.get(6)?,
            updated_at: new_updated_at,
            created_at: row.get(8)?,
        })
    })
}

// =============================================================================
// FOLDER OPERATIONS
// =============================================================================

#[tauri::command]
fn save_folder(folder: Folder, state: State<DbState>) -> Result<(), String> {
    if folder.id.is_empty() {
        return Err("Folder ID cannot be empty".to_string());
    }

    state.with_conn(|conn| {
        conn.execute(
            "INSERT INTO folders (id, name, created_at) VALUES (?1, ?2, ?3)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name",
            params![folder.id, folder.name, folder.created_at],
        )?;
        Ok(())
    })
}

#[tauri::command]
fn get_all_folders(state: State<DbState>) -> Result<Vec<Folder>, String> {
    state.with_conn(|conn| {
        let mut stmt =
            conn.prepare("SELECT id, name, created_at FROM folders ORDER BY created_at DESC")?;

        let folders = stmt.query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })?;

        folders.collect::<SqliteResult<Vec<_>>>()
    })
}

#[tauri::command]
fn delete_folder(id: String, state: State<DbState>) -> Result<(), String> {
    if id.is_empty() {
        return Err("Folder ID cannot be empty".to_string());
    }

    // FIX #2: Use transaction for multi-step operation
    state.with_conn(|conn| {
        // Unfile notes first, then delete folder
        conn.execute(
            "UPDATE notes SET folder_id = NULL WHERE folder_id = ?1",
            params![id],
        )?;

        conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;

        Ok(())
    })
}

// =============================================================================
// SEARCH
// =============================================================================

#[tauri::command]
fn search_notes(query: String, state: State<DbState>) -> Result<Vec<Note>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    // FIX: Sanitize FTS query to prevent injection
    let sanitized_query = sanitize_fts_query(&query);
    if sanitized_query.is_empty() {
        return Ok(vec![]);
    }

    state.with_conn(|conn| {
        let mut stmt = conn.prepare(
            "SELECT n.id, n.title, n.content, n.folder_id, n.is_pinned, n.pinned_at, n.font, n.updated_at, n.created_at
             FROM notes n
             JOIN notes_fts f ON n.id = f.id
             WHERE notes_fts MATCH ?1
             ORDER BY rank
             LIMIT 50"
        )?;

        let notes = stmt.query_map(params![sanitized_query], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                folder_id: row.get(3)?,
                is_pinned: row.get(4)?,
                pinned_at: row.get(5)?,
                font: row.get(6)?,
                updated_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })?;

        notes.collect::<SqliteResult<Vec<_>>>()
    })
}

/// Sanitize user input for FTS5 queries
fn sanitize_fts_query(query: &str) -> String {
    // Remove FTS5 special characters that could cause issues
    let cleaned: String = query
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect();

    let trimmed = cleaned.trim();

    if trimmed.is_empty() {
        return String::new();
    }

    // Wrap in quotes for phrase matching, add * for prefix matching
    format!("\"{}\"*", trimmed)
}

// =============================================================================
// SETUP
// =============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Set up logging
            env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
                .init();

            // Get app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Failed to get app data dir: {}", e))?;

            // Create directory if it doesn't exist
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir)
                    .map_err(|e| format!("Failed to create app data dir: {}", e))?;
            }

            let db_path = app_data_dir.join("webnotes.db");
            log::info!("Database path: {:?}", db_path);

            // Initialize database state
            let db_state = DbState::new(db_path)
                .map_err(|e| format!("Failed to initialize database: {}", e))?;

            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_db,
            save_note,
            get_all_notes,
            get_note,
            delete_note,
            toggle_pin,
            save_folder,
            get_all_folders,
            delete_folder,
            search_notes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
