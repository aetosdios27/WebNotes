// src/editor/cursor.rs

use super::super::editor::Buffer;

#[derive(Debug, Clone, Copy)]
pub struct Cursor {
    pub line: usize,
    pub col: usize,
    desired_col: usize,
}

impl Cursor {
    pub fn new() -> Self {
        Self {
            line: 0,
            col: 0,
            desired_col: 0,
        }
    }

    pub fn move_left(&mut self, buffer: &Buffer) {
        if self.col > 0 {
            self.col -= 1;
            self.desired_col = self.col;
        } else if self.line > 0 {
            self.line -= 1;
            self.col = buffer.line_len(self.line);
            self.desired_col = self.col;
        }
    }

    pub fn move_right(&mut self, buffer: &Buffer) {
        let line_len = buffer.line_len(self.line);
        if self.col < line_len {
            self.col += 1;
            self.desired_col = self.col;
        } else if self.line < buffer.line_count().saturating_sub(1) {
            self.line += 1;
            self.col = 0;
            self.desired_col = 0;
        }
    }

    pub fn move_up(&mut self, buffer: &Buffer) {
        if self.line > 0 {
            self.line -= 1;
            self.col = self.desired_col.min(buffer.line_len(self.line));
        }
    }

    pub fn move_down(&mut self, buffer: &Buffer) {
        if self.line < buffer.line_count().saturating_sub(1) {
            self.line += 1;
            self.col = self.desired_col.min(buffer.line_len(self.line));
        }
    }

    pub fn move_to_line_start(&mut self) {
        self.col = 0;
        self.desired_col = 0;
    }

    pub fn move_to_line_end(&mut self, buffer: &Buffer) {
        self.col = buffer.line_len(self.line);
        self.desired_col = self.col;
    }

    pub fn move_word_forward(&mut self, buffer: &Buffer) {
        // TODO: Implement vim 'w' motion
        self.move_right(buffer);
    }

    pub fn move_word_backward(&mut self, buffer: &Buffer) {
        // TODO: Implement vim 'b' motion
        self.move_left(buffer);
    }
}
