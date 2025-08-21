export type Role = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  securityQuestion?: string;
  securityAnswerHash?: string; // sha256
  createdAt?: number;
}