
import { Router } from "express";
import { auth, db, FieldValue } from "../config/firebase";

const router = Router();

// สร้างผู้ใช้ (admin-only) – ถ้าจะเก็บไว้ทดสอบก็ได้
router.post("/create", async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;
    const user = await auth.createUser({ email, password, displayName });
    res.json({ uid: user.uid, email: user.email, displayName: user.displayName });
  } catch (err) { next(err); }
});

// ตรวจ Firebase ID Token + สร้าง profile ครั้งแรก
router.post("/verify", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: "Missing idToken" });

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email || "";

    // หา profile ใน Firestore
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      // สร้างครั้งแรก
      const profile = {
        uid,
        email,
        role: "user",
        displayName: decoded.name || "",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await ref.set(profile, { merge: true });
    } else {
      // อัปเดต last seen
      await ref.set({ updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    const final = (await ref.get()).data();

    res.json({
      ok: true,
      uid,
      email,
      profile: final || null,
      decoded,
    });
  } catch (err) { next(err); }
});

export default router;
