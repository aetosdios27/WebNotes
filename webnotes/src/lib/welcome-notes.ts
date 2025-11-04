export const welcomeNotes = [
  {
    title: "🎉 Welcome to WebNotes!",
    content: `
# Welcome to WebNotes!

Your new favorite place to write and think. Here's what makes WebNotes special:

## ✨ Key Features

### Command Palette
Press **Cmd+K** (or **Ctrl+K** on Windows) to open the command palette. Search notes, create new ones, or run commands - all without touching your mouse.

### Slash Commands
Type **/** in any note to see formatting options. Try **/heading** or **/list** to get started.

### Markdown Support
Write in plain text and we'll format it beautifully. Try:
- **Bold text** with \`**text**\`
- *Italic text* with \`*text*\`
- \`Inline code\` with backticks
- Lists with \`-\` or \`1.\`

### Organization
- 📁 Create folders to organize your notes
- 📌 Pin important notes to keep them at the top
- 🔍 Search everything instantly

## 🚀 Quick Start

1. Create your first note with **Cmd+E**
2. Try typing **/** to see slash commands
3. Press **Cmd+K** to search or run commands
4. Drag notes into folders to organize them

---

*This note will self-destruct once you create your own notes. Happy writing!*
    `.trim(),
    isPinned: true,
    pinnedAt: new Date(),
  },
  {
    title: "⌨️ Keyboard Shortcuts",
    content: `
# Keyboard Shortcuts

Master these shortcuts to become a WebNotes power user:

## Essential Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Command Palette | **Cmd+K** | **Ctrl+K** |
| New Note | **Cmd+E** | **Ctrl+E** |
| New Folder | **Cmd+Shift+F** | **Ctrl+Shift+F** |

## In Editor

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Bold | **Cmd+B** | **Ctrl+B** |
| Italic | **Cmd+I** | **Ctrl+I** |
| Slash Commands | **/** | **/** |

## Slash Commands

Type **/** anywhere in a note to see formatting options:

- **/h1**, **/h2**, **/h3** - Headings
- **/bullet** - Bullet list
- **/number** - Numbered list
- **/quote** - Blockquote
- **/code** - Code block
- **/divider** - Horizontal line

## Pro Tips

- **Drag and drop** notes between folders
- **Right-click** (or long-press on mobile) for context menus
- **Pin notes** to keep them at the top
- Click the **info button** (ℹ️) to see word count and export options
- Notes auto-save as you type

---

*These shortcuts actually work - we promise!*
    `.trim(),
    isPinned: false,
  },
  {
    title: "📝 Markdown Examples",
    content: `
# Markdown Formatting Examples

WebNotes supports full Markdown formatting. Here are some examples:

## Text Formatting

**Bold text** - Use \`**text**\` or \`__text__\`

*Italic text* - Use \`*text*\` or \`_text_\`

~~Strikethrough~~ - Use \`~~text~~\`

\`Inline code\` - Use backticks

## Lists

### Bullet List
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Numbered List
1. First step
2. Second step
   1. Sub-step
   2. Another sub-step
3. Third step

### Todo List
- [ ] Unchecked item
- [x] Checked item
- [ ] Another task

## Code Blocks

\`\`\`javascript
function hello() {
  console.log("Hello, WebNotes!");
}
\`\`\`

\`\`\`python
def hello():
    print("Hello, WebNotes!")
\`\`\`

## Blockquotes

> This is a blockquote
> 
> It can span multiple lines

## Links

[Visit GitHub](https://github.com)

## Horizontal Rule

Use three dashes for a divider:

---

## Tables

| Feature | Status |
|---------|--------|
| Markdown | ✅ Supported |
| Slash Commands | ✅ Supported |
| Real-time Sync | ✅ Supported |

---

*Feel free to edit or delete this note. Happy formatting!*
    `.trim(),
    isPinned: false,
  }
];