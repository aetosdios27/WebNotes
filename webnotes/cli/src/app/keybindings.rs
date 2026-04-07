// src/app/keybindings.rs

use anyhow::Result;
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use super::{App, Mode};
use crate::app::commands;

pub fn handle_key(app: &mut App, key: KeyEvent) -> Result<()> {
    match app.mode {
        Mode::Normal => handle_normal(app, key),
        Mode::Insert => handle_insert(app, key),
        Mode::Visual => handle_visual(app, key),
        Mode::Command => handle_command(app, key),
    }
}

fn handle_normal(app: &mut App, key: KeyEvent) -> Result<()> {
    match (key.modifiers, key.code) {
        // Mode switching
        (_, KeyCode::Char('i')) => app.mode = Mode::Insert,
        (_, KeyCode::Char('v')) => app.mode = Mode::Visual,
        (_, KeyCode::Char(':')) => {
            app.mode = Mode::Command;
            app.command_buffer.clear();
        }

        // Movement
        (_, KeyCode::Char('h')) | (_, KeyCode::Left) => app.cursor.move_left(&app.buffer),
        (_, KeyCode::Char('j')) | (_, KeyCode::Down) => app.cursor.move_down(&app.buffer),
        (_, KeyCode::Char('k')) | (_, KeyCode::Up) => app.cursor.move_up(&app.buffer),
        (_, KeyCode::Char('l')) | (_, KeyCode::Right) => app.cursor.move_right(&app.buffer),

        // Word movement
        (_, KeyCode::Char('w')) => app.cursor.move_word_forward(&app.buffer),
        (_, KeyCode::Char('b')) => app.cursor.move_word_backward(&app.buffer),

        // Line movement
        (_, KeyCode::Char('0')) => app.cursor.move_to_line_start(),
        (_, KeyCode::Char('$')) => app.cursor.move_to_line_end(&app.buffer),

        // Ctrl shortcuts
        (KeyModifiers::CONTROL, KeyCode::Char('s')) => app.save()?,
        (KeyModifiers::CONTROL, KeyCode::Char('q')) => app.quit(),

        _ => {}
    }
    Ok(())
}

fn handle_insert(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Esc => app.mode = Mode::Normal,
        KeyCode::Char(c) => app.buffer.insert_char(&mut app.cursor, c),
        KeyCode::Backspace => app.buffer.delete_char_before(&mut app.cursor),
        KeyCode::Enter => app.buffer.insert_newline(&mut app.cursor),
        KeyCode::Tab => app.buffer.insert_char(&mut app.cursor, '\t'),
        _ => {}
    }
    Ok(())
}

fn handle_visual(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Esc => app.mode = Mode::Normal,
        // TODO: Visual mode operations
        _ => {}
    }
    Ok(())
}

fn handle_command(app: &mut App, key: KeyEvent) -> Result<()> {
    match key.code {
        KeyCode::Esc => {
            app.mode = Mode::Normal;
            app.command_buffer.clear();
        }
        KeyCode::Enter => {
            commands::execute(app)?;
            app.mode = Mode::Normal;
            app.command_buffer.clear();
        }
        KeyCode::Char(c) => app.command_buffer.push(c),
        KeyCode::Backspace => {
            app.command_buffer.pop();
        }
        _ => {}
    }
    Ok(())
}
