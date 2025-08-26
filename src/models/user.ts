export type Role = "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string;
  passwordHash: string; // bcrypt
  role: Role;
  securityQuestion?: string;
  securityAnswerHash?: string; // sha256
  createdAt?: number;
}