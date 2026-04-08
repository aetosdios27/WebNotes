// src/app/commands.rs

use anyhow::Result;

use super::App;

pub fn execute(app: &mut App) -> Result<()> {
    let cmd = app.command_buffer.trim();

    match cmd {
        "w" | "write" => app.save()?,
        "q" | "quit" => app.quit(),
        "wq" | "x" => {
            app.save()?;
            app.quit();
        }
        "q!" => app.quit(),
        _ => {
            // Unknown command - could show error notification
        }
    }

    Ok(())
}
