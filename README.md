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
````

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment Variables

Create a file named `.env` in the root of your project and add the following variables.

```bash
# 1. Database Connection String (from Neon)
DATABASE_URL="postgres://..."

# 2. Auth.js Secret (generate one with `openssl rand -base64 32`)
AUTH_SECRET="your-strong-random-secret"

# 3. Google OAuth Credentials
GOOGLE_CLIENT_ID="your-client-id-from-google"
GOOGLE_CLIENT_SECRET="your-client-secret-from-google"

# 4. NextAuth.js URL (for local development)
AUTH_URL=http://localhost:3000
```

### 5. Sync the Database

Push the Prisma schema to your database. This will create all the necessary tables.

```bash
npx prisma db push
# (You may also need to run `npx prisma generate` after installing dependencies)
```

### 6. Run the Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Future Roadmap

* [ ] Advanced Search: Full-text and semantic search within note content.
* [ ] Command Palette (Cmd/Ctrl + K): For lightning-fast navigation and actions.
* [ ] Note Pinning & Context Menus: For enhanced organization and power-user workflows.
* [ ] Sharing: Public read-only links for notes and PDF export.
* [ ] Real-Time Collaboration: The long-term vision for multi-user editing.

---

## 📄 License

This project is licensed under the **MIT License**.

```
```