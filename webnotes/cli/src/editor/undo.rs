// src/editor/undo.rs

use ropey::Rope;

const MAX_HISTORY: usize = 1000;

pub struct UndoStack {
    undo_stack: Vec<Rope>,
    redo_stack: Vec<Rope>,
}

impl UndoStack {
    pub fn new() -> Self {
        Self {
            undo_stack: Vec::new(),
            redo_stack: Vec::new(),
        }
    }

    pub fn push(&mut self, rope: &Rope) {
        self.undo_stack.push(rope.clone());
        self.redo_stack.clear();

        if self.undo_stack.len() > MAX_HISTORY {
            self.undo_stack.remove(0);
        }
    }

    pub fn undo(&mut self, current: &Rope) -> Option<Rope> {
        if let Some(prev) = self.undo_stack.pop() {
            self.redo_stack.push(current.clone());
            Some(prev)
        } else {
            None
        }
    }

    pub fn redo(&mut self) -> Option<Rope> {
        self.redo_stack.pop()
    }
}
