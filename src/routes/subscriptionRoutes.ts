import { Router } from "express";
import Stripe from "stripe";
import { env } from "../config/envv";
import { requireAuth } from "../middlewares/authMiddleware";
import { db, FieldValue } from "../config/firebase";

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

// สร้าง checkout session (ผู้ใช้กดสมัคร)
router.post("/create-checkout", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const priceId = req.body.priceId || env.STRIPE_PRICE_ID_PRO;
    if (!priceId) return res.status(400).json({ error: "Missing priceId" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription-cancel`,
      metadata: { uid },
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) { next(err); }
});

// เอาสถานะ subscription ของผู้ใช้
router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const doc = await db.collection("users").doc(uid).get();
    const sub = doc.data()?.subscription || null;
    res.json({ subscription: sub });
  } catch (err) { next(err); }
});

// (ทางเลือก) Endpoint สำหรับ webhook จาก Stripe -> อัปเดต Firestore
// **แนะนำ** ตั้งค่า STRIPE_WEBHOOK_SECRET ใน .env และเปิดใช้งานตามจริง
router.post("/webhook", async (req, res) => {
  // NOTE: ถ้าจะใช้งาน webhook จริง ต้องใช้ body raw (express.raw) และ verify signature
  // ที่นี่ขอเว้นไว้เป็นคอมเมนต์ตัวอย่าง
  res.json({ ok: true, note: "Implement Stripe webhook verification in production." });
});

export default router;
