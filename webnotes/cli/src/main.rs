// src/main.rs

mod app;
mod editor;
mod notes;
mod search;
mod storage;
mod syntax;
mod ui;
mod utils;

use anyhow::Result;
use app::App;

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();

    match args.get(1).map(|s| s.as_str()) {
        Some("init") => {
            storage::workspace::init_workspace()?;
        }
        Some("--help") | Some("-h") => {
            print_help();
        }
        Some("--version") | Some("-v") => {
            println!("webnotes {}", env!("CARGO_PKG_VERSION"));
        }
        Some(path) => {
            // Open specific file
            let mut app = App::new()?;
            app.open_file(path)?;
            app.run()?;
        }
        None => {
            // Open picker
            let mut app = App::new()?;
            app.run()?;
        }
    }

    Ok(())
}

fn print_help() {
    println!(
        r#"
webnotes - Terminal-native note editor

USAGE:
    webnotes [OPTIONS] [FILE]

OPTIONS:
    -h, --help       Print help information
    -v, --version    Print version

COMMANDS:
    init             Initialize a new webnotes workspace
    <file>           Open a specific file
    (none)           Open note picker

KEYBINDINGS:
    Normal Mode:
        i            Enter insert mode
        v            Enter visual mode
        :            Enter command mode
        h/j/k/l      Move cursor
        w/b          Word forward/backward
        gg/G         Go to top/bottom
        dd           Delete line
        u            Undo
        Ctrl-r       Redo
        Ctrl-p       Open note picker
        Ctrl-s       Save
        Ctrl-q       Quit

    Insert Mode:
        Esc          Return to normal mode

    Command Mode:
        :w           Save
        :q           Quit
        :wq          Save and quit
        :q!          Force quit
"#
    );
}
