use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{Manager, State};

// --- DATA TYPES ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Note {
    id: String,
    title: String,
    content: String,
    folder_id: Option<String>,
    is_pinned: bool,
    updated_at: String,
    created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Folder {
    id: String,
    name: String,
    created_at: String,
}

// --- STATE ---
struct DbState {
    path: PathBuf,
}

impl DbState {
    fn conn(&self) -> Connection {
        Connection::open(&self.path).expect("Connection failed")
    }
}

// --- COMMANDS ---

#[tauri::command]
fn init_db(state: State<DbState>) -> Result<String, String> {
    let conn = state.conn();

    // 1. Create Notes Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            folder_id TEXT,
            is_pinned INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // 2. Create Folders Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS folders (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;

    // 3. Create Search Index
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id, title, content)",
        [],
    )
    .map_err(|e| e.to_string())?;

    println!("Database Initialized at {:?}", state.path);
    Ok("Database Initialized".to_string())
}

#[tauri::command]
fn save_note(note: Note, state: State<DbState>) -> Result<(), String> {
    // println!("RUST: Saving Note: {:?}", note.title);

    let conn = state.conn();

    conn.execute(
        "INSERT INTO notes (id, title, content, folder_id, is_pinned, updated_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         content=excluded.content,
         folder_id=excluded.folder_id,
         is_pinned=excluded.is_pinned,
         updated_at=excluded.updated_at",
        params![
            note.id,
            note.title,
            note.content,
            note.folder_id,
            note.is_pinned,
            Utc::now().to_rfc3339(), // Ensure server-side timestamp or trust client? Client sent one, but we update updated_at
            note.created_at
        ],
    )
    .map_err(|e| format!("SQL Error: {}", e))?;

    // Update Search Index
    let _ = conn.execute(
        "INSERT INTO notes_fts (id, title, content) VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content",
        params![note.id, note.title, note.content],
    );

    Ok(())
}

#[tauri::command]
fn save_folder(folder: Folder, state: State<DbState>) -> Result<(), String> {
    // println!("RUST: Saving Folder: {:?}", folder.name);
    let conn = state.conn();
    conn.execute(
        "INSERT INTO folders (id, name, created_at) VALUES (?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name",
        params![folder.id, folder.name, folder.created_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_all_notes(state: State<DbState>) -> Result<Vec<Note>, String> {
    let conn = state.conn();
    let mut stmt = conn
        .prepare("SELECT * FROM notes ORDER BY updated_at DESC")
        .unwrap();

    let notes = stmt
        .query_map([], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                folder_id: row.get(3)?,
                is_pinned: row.get(4)?,
                updated_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for n in notes {
        result.push(n.unwrap());
    }
    Ok(result)
}

#[tauri::command]
fn get_all_folders(state: State<DbState>) -> Result<Vec<Folder>, String> {
    let conn = state.conn();
    let mut stmt = conn
        .prepare("SELECT * FROM folders ORDER BY created_at DESC")
        .unwrap();
    let folders = stmt
        .query_map([], |row| {
            Ok(Folder {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for f in folders {
        result.push(f.unwrap());
    }
    Ok(result)
}

#[tauri::command]
fn search_notes(query: String, state: State<DbState>) -> Result<Vec<Note>, String> {
    let conn = state.conn();
    let mut stmt = conn
        .prepare(
            "SELECT n.* FROM notes n
         JOIN notes_fts f ON n.id = f.id
         WHERE notes_fts MATCH ?1
         ORDER BY rank LIMIT 20",
        )
        .unwrap();

    let search_query = format!("{}*", query);
    let notes = stmt
        .query_map(params![search_query], |row| {
            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                folder_id: row.get(3)?,
                is_pinned: row.get(4)?,
                updated_at: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for n in notes {
        result.push(n.unwrap());
    }
    Ok(result)
}

// --- NEW COMMANDS (Must be here for deletions to persist!) ---

#[tauri::command]
fn delete_note(id: String, state: State<DbState>) -> Result<(), String> {
    // println!("RUST: Deleting Note: {}", id);
    let conn = state.conn();
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM notes_fts WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_folder(id: String, state: State<DbState>) -> Result<(), String> {
    // println!("RUST: Deleting Folder: {}", id);
    let conn = state.conn();

    // 1. Unfile notes that were in this folder
    conn.execute(
        "UPDATE notes SET folder_id = NULL WHERE folder_id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;

    // 2. Delete the folder
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

// --- SETUP ---
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap();
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).unwrap();
            }
            let db_path = app_data_dir.join("webnotes.db");
            app.manage(DbState { path: db_path });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            init_db,
            save_note,
            save_folder,
            get_all_notes,
            get_all_folders,
            search_notes,
            delete_note,   // <--- Ensure registered
            delete_folder  // <--- Ensure registered
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
