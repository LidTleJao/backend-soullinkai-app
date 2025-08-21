export interface Persona {
  id: string;
  userId: string;
  name: string;
  mode: "personality" | "update_history";
  jsonFileUrl: string;   // signed/public URL to JSON in Storage
  imageUrl?: string;     // signed/public URL to image in Storage
  createdAt: number;
  updatedAt: number;
}