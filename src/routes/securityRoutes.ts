import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { db, FieldValue } from "../config/firebase";
import { createOtpForUser, verifyOtp } from "../utils/otp";
import { hashAnswer } from "../utils/encrypt";

const router = Router();

// ขอ OTP (เดโม่: ส่งรหัสกลับให้ client แสดง — โปรดเปลี่ยนไปส่ง Email/SMS จริงในโปรดักชัน)
router.post("/otp/request", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const { code, expiresAt } = await createOtpForUser(uid);
    res.json({ otp: code, expiresAt }); // อย่าส่งจริงใน production
  } catch (err) {
    next(err);
  }
});

// ยืนยัน OTP
router.post("/otp/verify", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const ok = await verifyOtp(uid, code);
    res.json({ ok });
  } catch (err) {
    next(err);
  }
});

// ตั้ง Security Questions
router.post("/security/setup", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const { questions } = req.body;
    // format: [{question: string, answer: string}, ...]
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Invalid questions" });
    }
    const hashed = questions.map((q: any) => ({
      question: q.question,
      answerHash: hashAnswer(q.answer || ""),
    }));

    await db.collection("users").doc(uid).set({
      security: {
        questions: hashed,
        updatedAt: FieldValue.serverTimestamp(),
      }
    }, { merge: true });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ตรวจ Security Questions
router.post("/security/verify", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const { answers } = req.body;
    // format: [{question: string, answer: string}, ...]
    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "Invalid answers" });
    }

    const doc = await db.collection("users").doc(uid).get();
    const sec = doc.data()?.security;
    if (!sec?.questions) return res.status(404).json({ error: "No security questions" });

    // ตรวจคำถาม/คำตอบตาม question text (หรือใช้ index ก็ได้)
    const ok = answers.every((a: any) => {
      const want = sec.questions.find((q: any) => q.question === a.question);
      if (!want) return false;
      return want.answerHash === hashAnswer(a.answer || "");
    });

    res.json({ ok });
  } catch (err) {
    next(err);
  }
});

export default router;
