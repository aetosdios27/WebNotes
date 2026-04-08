mod commands;
mod keybindings;
mod modes;

pub use modes::Mode;

use anyhow::Result;
use crossterm::{
    event::{self, Event},
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
        // Extract all the data we need before the closure
        let cursor_line = self.cursor.line;
        let cursor_col = self.cursor.col;
        let viewport_offset = self.viewport.offset;
        let mode = self.mode;
        let buffer_line_count = self.buffer.line_count();
        let buffer_modified = self.buffer.modified;
        let buffer_path = self.buffer.path.clone();
        let command_buffer = self.command_buffer.clone();

        // Collect visible lines
        let mut visible_lines: Vec<String> = Vec::new();
        for i in 0..self.viewport.height {
            let line_idx = viewport_offset + i;
            if line_idx < buffer_line_count {
                let line = self
                    .buffer
                    .line(line_idx)
                    .map(|l| l.to_string())
                    .unwrap_or_default()
                    .trim_end_matches('\n')
                    .to_string();
                visible_lines.push(line);
            }
        }

        // Create a snapshot struct to pass to render
        let snapshot = ui::render::RenderSnapshot {
            cursor_line,
            cursor_col,
            viewport_offset,
            mode,
            buffer_modified,
            buffer_path,
            command_buffer,
            visible_lines,
        };

        self.terminal.draw(|frame| {
            ui::render::render(frame, &snapshot);
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
