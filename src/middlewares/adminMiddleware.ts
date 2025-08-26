import { Request, Response, NextFunction } from "express";
import { db } from "../config/firebase";

/** ใช้คู่กับ requireAuth: ตรวจว่าผู้ใช้เป็น admin จาก custom claims หรือจาก users.role */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user as { uid: string; [k: string]: any } | undefined;
    if (!user?.uid) return res.status(401).json({ error: "Unauthorized" });

    // 1) custom claims (ถ้าตั้งค่าไว้)
    const isAdminClaim = !!user.admin || user.role === "admin";

    // 2) fallback: เช็คที่ Firestore users/{uid}.role
    let isAdminDoc = false;
    try {
      const doc = await db.collection("users").doc(user.uid).get();
      const role = doc.exists ? (doc.data()?.role as string | undefined) : undefined;
      isAdminDoc = role === "admin";
    } catch { /* noop */ }

    if (!isAdminClaim && !isAdminDoc) {
      return res.status(403).json({ error: "Forbidden (admin only)" });
    }
    next();
  } catch (err) {
    next(err);
  }
}
