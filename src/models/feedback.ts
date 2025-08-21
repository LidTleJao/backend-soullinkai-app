export interface Feedback {
  id: string;
  userId: string;
  personaId?: string;
  type: "bug" | "suggestion" | "other";
  message: string;
  status: "open" | "in_progress" | "closed";
  createdAt: number;
  updatedAt: number;
}