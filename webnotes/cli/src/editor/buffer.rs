// src/editor/buffer.rs

use anyhow::Result;
use ropey::Rope;
use std::path::PathBuf;

use super::{Cursor, UndoStack};

pub struct Buffer {
    pub rope: Rope,
    pub path: Option<PathBuf>,
    pub modified: bool,
    history: UndoStack,
}

impl Buffer {
    pub fn new() -> Self {
        Self {
            rope: Rope::new(),
            path: None,
            modified: false,
            history: UndoStack::new(),
        }
    }

    pub fn from_file(path: &str) -> Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Ok(Self {
            rope: Rope::from_str(&content),
            path: Some(PathBuf::from(path)),
            modified: false,
            history: UndoStack::new(),
        })
    }

    pub fn save(&mut self) -> Result<()> {
        if let Some(path) = &self.path {
            std::fs::write(path, self.rope.to_string())?;
            self.modified = false;
        }
        Ok(())
    }

    pub fn line_count(&self) -> usize {
        self.rope.len_lines()
    }

    pub fn line(&self, idx: usize) -> Option<ropey::RopeSlice> {
        if idx < self.line_count() {
            Some(self.rope.line(idx))
        } else {
            None
        }
    }

    pub fn line_len(&self, idx: usize) -> usize {
        self.line(idx)
            .map(|l| l.len_chars().saturating_sub(1)) // Exclude newline
            .unwrap_or(0)
    }

    pub fn insert_char(&mut self, cursor: &mut Cursor, c: char) {
        let idx = self.char_idx(cursor);
        self.history.push(&self.rope);
        self.rope.insert_char(idx, c);
        self.modified = true;
        cursor.col += 1;
    }

    pub fn insert_newline(&mut self, cursor: &mut Cursor) {
        let idx = self.char_idx(cursor);
        self.history.push(&self.rope);
        self.rope.insert_char(idx, '\n');
        self.modified = true;
        cursor.line += 1;
        cursor.col = 0;
    }

    pub fn delete_char_before(&mut self, cursor: &mut Cursor) {
        if cursor.col > 0 {
            let idx = self.char_idx(cursor);
            self.history.push(&self.rope);
            self.rope.remove(idx - 1..idx);
            self.modified = true;
            cursor.col -= 1;
        } else if cursor.line > 0 {
            // Join with previous line
            let prev_line_len = self.line_len(cursor.line - 1);
            let idx = self.char_idx(cursor);
            self.history.push(&self.rope);
            self.rope.remove(idx - 1..idx);
            self.modified = true;
            cursor.line -= 1;
            cursor.col = prev_line_len;
        }
    }

    pub fn undo(&mut self) -> bool {
        if let Some(prev) = self.history.undo(&self.rope) {
            self.rope = prev;
            self.modified = true;
            true
        } else {
            false
        }
    }

    pub fn redo(&mut self) -> bool {
        if let Some(next) = self.history.redo() {
            self.rope = next;
            self.modified = true;
            true
        } else {
            false
        }
    }

    fn char_idx(&self, cursor: &Cursor) -> usize {
        self.rope.line_to_char(cursor.line) + cursor.col
    }
}
