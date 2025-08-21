import { Router } from "express";
import { auth } from "../config/firebase";

const router = Router();

// สร้างผู้ใช้ (admin only - คุณคุมสิทธิ์เอง)
router.post("/create", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    const user = await auth.createUser({ email, password, displayName });
    res.json({ uid: user.uid, email: user.email, displayName: user.displayName });
  } catch (err) {
    next(err);
  }
});

// ตรวจ token
router.post("/verify", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const decoded = await auth.verifyIdToken(idToken);
    res.json({ ok: true, uid: decoded.uid, decoded });
  } catch (err) {
    next(err);
  }
});

export default router;
