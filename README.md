# WebNotes

**The missing link between Apple Notes and Obsidian.**

WebNotes is a high-performance, local-first knowledge base designed to bring the polish of macOS-native tools to Windows and Linux, without sacrificing the power features developers need.

It runs on **Tauri (Rust)** for native performance and **Next.js** for cloud synchronization.

---

## Why WebNotes?

Most note-taking apps force you to choose:

1. **Simple & Fast:** Apple Notes, Notepad  
   *(Limited features, platform locked)*  
2. **Powerful & Complex:** Obsidian, Emacs  
   *(High learning curve, ugly UI)*  
3. **Collaborative & Slow:** Notion  
   *(Electron bloat, online-only)*  

WebNotes takes the **Block-Based Editor** of Notion, the **Bidirectional Linking** of Obsidian, and wraps it in a **Native Rust Binary** that launches instantly.

---

## Key Capabilities

- **Zero-Latency Typing:** Sub-10ms editor response.
- **Bidirectional Linking:** Type `[[` to instantly link or create notes.
- **Mathematical Typesetting:** First-class LaTeX (`$E=mc^2$`) with live preview.
- **Local-First Architecture:** Notes stored in a local SQLite database.
- **Hybrid Sync:** Desktop for deep work, web for access anywhere.

---

## Technical Stack

| Component | Technology | Reasoning |
|---------|------------|-----------|
| **Desktop Runtime** | **Tauri (Rust)** | <10MB binary, native performance, no Electron bloat. |
| **Web Runtime** | **Next.js 15** | SSR + edge caching for global speed. |
| **Editor Engine** | **Tiptap (ProseMirror)** | Headless, schema-based, fully extensible. |
| **State** | **Zustand** | Predictable, optimistic UI state. |
| **Storage (Desktop)** | **SQLite** | Instant, file-based, local ownership. |
| **Storage (Web)** | **PostgreSQL (Neon)** | Serverless, scalable sync layer. |

---

## Installation

### Desktop (Windows, macOS, Linux)

**Mac / Linux**
```bash
curl -fsSL https://web-notes-lyart.vercel.app/install.sh | sh
````

**Windows (PowerShell)**

```powershell
irm https://web-notes-lyart.vercel.app/install.ps1 | iex
```

---

### Web Access

Visit:
👉 [https://web-notes-lyart.vercel.app](https://web-notes-lyart.vercel.app)

---

## Development

WebNotes is a monorepo powering both web and desktop clients.

### Prerequisites

* Node.js 18+
* Rust (stable)
* PostgreSQL

### Setup

```bash
git clone https://github.com/aetosdios27/WebNotes.git
cd WebNotes
npm install
```

Create `.env`:

```env
DATABASE_URL="postgres://..."
AUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

Run:

```bash
# Web
npm run dev

# Desktop
npm run tauri dev
```

---

## Roadmap

* [x] Wiki-Links (`[[`)
* [x] Backlinks Sidebar
* [ ] Graph View
* [ ] Rust/WASM Editor Core (DOM-less, ultra-performance engine)

---

## License

MIT © [Aetos Dios](https://github.com/aetosdios27)
