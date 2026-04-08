// src/editor/viewport.rs

pub struct Viewport {
    pub offset: usize,
    pub height: usize,
}

impl Viewport {
    pub fn new() -> Self {
        Self {
            offset: 0,
            height: 24, // Default, will be updated on render
        }
    }

    pub fn scroll_to_cursor(&mut self, cursor_line: usize) {
        if cursor_line < self.offset {
            self.offset = cursor_line;
        } else if cursor_line >= self.offset + self.height {
            self.offset = cursor_line - self.height + 1;
        }
    }

    pub fn visible_range(&self) -> std::ops::Range<usize> {
        self.offset..self.offset + self.height
    }
}
