export interface Note {
  id: string;
  title: string;
  content: string;
  "userId": string; // Make sure this is in your Note type
  "folderId": string | null; // Make sure this is in your Note type
  createdAt: Date;
  updatedAt: Date;
}

// Add this new interface
export interface Folder {
  id: string;
  name: string;
  "userId": string;
  createdAt: Date;
}