// src/editor/mod.rs

mod buffer;
mod cursor;
mod selection;
mod undo;
mod viewport;

pub use buffer::Buffer;
pub use cursor::Cursor;
pub use selection::Selection;
pub use undo::UndoStack;
pub use viewport::Viewport;
