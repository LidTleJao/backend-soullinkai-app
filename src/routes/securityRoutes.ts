
// export default router;
import nodemailer from "nodemailer";
import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { db } from "../config/firebase";
import { createOtpForUser, verifyOtp } from "../utils/otp";
import { env } from "../config/envv";

const router = Router();

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === "true", // 465 => true, 587 => false
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

// 🔎 ตรวจการเชื่อมต่อ SMTP ตอนบู๊ต
transporter.verify().then(() => {
  console.log("[smtp] transporter ready");
}).catch(err => {
  console.error("[smtp] verify failed:", err);
});

// ✅ Request OTP (ส่งอีเมลจริง)
router.post("/otp/request", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const userDoc = await db.collection("users").doc(uid).get();
    const email = userDoc.data()?.email;

    if (!email) {
      return res.status(400).json({ error: "User has no email" });
    }

    const { code, expiresAt } = await createOtpForUser(uid);

    await transporter.sendMail({
      from: env.FROM_EMAIL, // ต้องตรงกับ SMTP_USER หรือ alias
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${code}. It will expire in ${env.OTP_TTL_MINUTES} minutes.`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
          <h2>Everlink AI</h2>
          <p>Your OTP is <b style="font-size:18px">${code}</b></p>
          <p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>
        </div>
      `,
    }).catch(err => {
      console.error("[smtp] sendMail failed:", err); // 👈 ดู error จริงตรงนี้
      throw err;
    });

    res.json({ ok: true, expiresAt });
  } catch (err) {
    next(err);
  }
});

// ✅ Verify OTP — ส่ง 400 เมื่อโค้ดผิด/หมดอายุ (จะได้ไม่เป็น 500)
router.post("/otp/verify", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const ok = await verifyOtp(uid, code);
    if (!ok) {
      return res.status(400).json({ ok: false, error: "Invalid or expired OTP" });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
