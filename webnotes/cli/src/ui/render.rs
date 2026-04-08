use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph},
    Frame,
};
use std::path::PathBuf;

use super::statusline;
use crate::app::Mode;

/// Snapshot of app state for rendering (avoids borrow issues)
pub struct RenderSnapshot {
    pub cursor_line: usize,
    pub cursor_col: usize,
    pub viewport_offset: usize,
    pub mode: Mode,
    pub buffer_modified: bool,
    pub buffer_path: Option<PathBuf>,
    pub command_buffer: String,
    pub visible_lines: Vec<String>,
}

pub fn render(frame: &mut Frame, snapshot: &RenderSnapshot) {
    let area = frame.size();

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(1), Constraint::Length(1)])
        .split(area);

    render_editor(frame, snapshot, chunks[0]);
    statusline::render(frame, snapshot, chunks[1]);

    // Position cursor (only in Normal/Insert/Visual modes)
    if snapshot.mode != Mode::Command {
        let cursor_x = (snapshot.cursor_col + 5) as u16; // 5 = line number width
        let cursor_y = (snapshot
            .cursor_line
            .saturating_sub(snapshot.viewport_offset)) as u16;

        let final_x = chunks[0].x + cursor_x;
        let final_y = chunks[0].y + cursor_y;

        // Make sure cursor is within bounds
        if final_x < chunks[0].x + chunks[0].width && final_y < chunks[0].y + chunks[0].height {
            frame.set_cursor(final_x, final_y);
        }
    } else {
        // In command mode, cursor is at the end of command buffer
        let cursor_x = (snapshot.command_buffer.len() + 2) as u16; // 2 = " :" prefix
        frame.set_cursor(chunks[1].x + cursor_x, chunks[1].y);
    }
}

fn render_editor(frame: &mut Frame, snapshot: &RenderSnapshot, area: Rect) {
    let mut lines: Vec<Line> = Vec::new();

    for (i, line_content) in snapshot.visible_lines.iter().enumerate() {
        let line_num = snapshot.viewport_offset + i + 1;
        let line_num_str = format!("{:4} ", line_num);

        lines.push(Line::from(vec![
            Span::styled(line_num_str, Style::default().fg(Color::DarkGray)),
            Span::raw(line_content.clone()),
        ]));
    }

    // Fill remaining space with empty lines (tilde like vim)
    let visible_count = snapshot.visible_lines.len();
    for _ in visible_count..(area.height as usize) {
        lines.push(Line::from(vec![Span::styled(
            "   ~ ",
            Style::default().fg(Color::DarkGray),
        )]));
    }

    let paragraph = Paragraph::new(lines).block(Block::default().borders(Borders::NONE));

    frame.render_widget(paragraph, area);
}
