// src/storage/workspace.rs

use anyhow::Result;
use std::fs;
use std::path::Path;

pub fn init_workspace() -> Result<()> {
    let notes_dir = Path::new("notes");
    let config_dir = Path::new(".webnotes");

    fs::create_dir_all(notes_dir)?;
    fs::create_dir_all(config_dir)?;

    let config = serde_json::json!({
        "version": 1,
        "created": chrono::Utc::now().to_rfc3339(),
    });

    fs::write(
        config_dir.join("config.json"),
        serde_json::to_string_pretty(&config)?,
    )?;

    println!("✓ Initialized webnotes workspace");
    println!("  ./notes/           Your notes");
    println!("  ./.webnotes/       Config");

    Ok(())
}
