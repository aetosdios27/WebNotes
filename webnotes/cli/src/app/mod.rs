// src/app/mod.rs

mod commands;
mod keybindings;
mod modes;

pub use modes::Mode;

use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyEvent},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io::{self, Stdout};

use crate::editor::{Buffer, Cursor, Viewport};
use crate::ui;

pub struct App {
    pub buffer: Buffer,
    pub cursor: Cursor,
    pub viewport: Viewport,
    pub mode: Mode,
    pub running: bool,
    pub command_buffer: String,
    terminal: Terminal<CrosstermBackend<Stdout>>,
}

impl App {
    pub fn new() -> Result<Self> {
        enable_raw_mode()?;
        let mut stdout = io::stdout();
        execute!(stdout, EnterAlternateScreen)?;
        let backend = CrosstermBackend::new(stdout);
        let terminal = Terminal::new(backend)?;

        Ok(Self {
            buffer: Buffer::new(),
            cursor: Cursor::new(),
            viewport: Viewport::new(),
            mode: Mode::Normal,
            running: true,
            command_buffer: String::new(),
            terminal,
        })
    }

    pub fn open_file(&mut self, path: &str) -> Result<()> {
        self.buffer = Buffer::from_file(path)?;
        Ok(())
    }

    pub fn run(&mut self) -> Result<()> {
        while self.running {
            self.draw()?;
            self.handle_events()?;
        }
        self.cleanup()?;
        Ok(())
    }

    fn draw(&mut self) -> Result<()> {
        self.terminal.draw(|frame| {
            ui::render::render(frame, self);
        })?;
        Ok(())
    }

    fn handle_events(&mut self) -> Result<()> {
        if let Event::Key(key) = event::read()? {
            keybindings::handle_key(self, key)?;
        }
        Ok(())
    }

    fn cleanup(&mut self) -> Result<()> {
        disable_raw_mode()?;
        execute!(self.terminal.backend_mut(), LeaveAlternateScreen)?;
        Ok(())
    }

    pub fn quit(&mut self) {
        self.running = false;
    }

    pub fn save(&mut self) -> Result<()> {
        self.buffer.save()?;
        Ok(())
    }
}
