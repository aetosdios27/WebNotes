# 📝 WebNotes

A simple, fast, and beautiful note-taking app for the web, inspired by the sleekness of Apple Notes and the speed of Excalidraw. Built for the majority of users who are overwhelmed by bloated, complicated solutions.

---

## ✨ Key Features

- **Rich-Text & Markdown Editor**: A powerful and intuitive editor powered by Tiptap.  
- **Secure Authentication**: Full Google OAuth login handled by NextAuth.js (Auth.js).  
- **Hierarchical Organization**: Organize notes with expandable/collapsible folders.  
- **Drag & Drop**: Intuitively move notes between folders with a seamless drag-and-drop interface.  
- **Optimistic UI**: All actions, like moving notes, feel instantaneous with zero network lag.  
- **Blazing Fast Feel**: A highly polished UI with loading skeletons and fluid animations using Framer Motion.  
- **Persistent UI State**: The app remembers which folders you had open between sessions.  
- **Auto-Saving**: Notes are automatically saved to the database as you type.  

---

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)  
- **Language**: TypeScript  
- **Database**: PostgreSQL (managed by Neon)  
- **ORM**: Prisma  
- **Authentication**: NextAuth.js (Auth.js)  
- **Styling**: Tailwind CSS  
- **UI Components**: shadcn/ui  
- **Editor**: Tiptap  
- **Deployment**: Vercel  

---

## 🚀 Getting Started

Follow these instructions to set up and run the project locally.

### 1. Prerequisites
- Node.js (v18.17 or later)  
- npm (or your favorite package manager)  
- A PostgreSQL database URL (e.g., from Neon)  

### 2. Clone the Repository
```bash
git clone https://github.com/aetosdios27/WebNotes.git
cd WebNotes