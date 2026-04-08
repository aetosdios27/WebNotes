use ratatui::{
    layout::Rect,
    style::{Color, Style},
    text::Span,
    widgets::Paragraph,
    Frame,
};

use super::render::RenderSnapshot;
use crate::app::Mode;

pub fn render(frame: &mut Frame, snapshot: &RenderSnapshot, area: Rect) {
    let mode_color = match snapshot.mode {
        Mode::Normal => Color::Blue,
        Mode::Insert => Color::Green,
        Mode::Visual => Color::Magenta,
        Mode::Command => Color::Yellow,
    };

    let file_name = snapshot
        .buffer_path
        .as_ref()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("[No Name]");

    let modified = if snapshot.buffer_modified { " [+]" } else { "" };

    let status = if snapshot.mode == Mode::Command {
        format!(" :{}", snapshot.command_buffer)
    } else {
        format!(
            " {} │ {}{} │ {}:{} ",
            snapshot.mode.as_str(),
            file_name,
            modified,
            snapshot.cursor_line + 1,
            snapshot.cursor_col + 1,
        )
    };

    let statusline =
        Paragraph::new(Span::raw(status)).style(Style::default().bg(mode_color).fg(Color::Black));

    frame.render_widget(statusline, area);
}
