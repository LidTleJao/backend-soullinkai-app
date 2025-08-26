
// src/routes/subscriptionRoutes.ts
import { Router } from "express";
import Stripe from "stripe";
import { env } from "../config/envv";
import { requireAuth } from "../middlewares/authMiddleware";
import { db } from "../config/firebase";

const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

// สร้าง checkout session (ผู้ใช้กดสมัคร)
router.post("/create-checkout", requireAuth, async (req, res) => {
  try {
    const uid = (req as any).user.uid;

    let priceId: string | undefined = req.body.priceId || env.STRIPE_PRICE_ID_PRO;
    if (!priceId) {
      return res.status(400).json({ error: "Missing priceId" });
    }

    // เผื่อ dev ใส่ prod_ มา ให้แปลงเป็น default_price
    if (priceId.startsWith("prod_")) {
      const product = await stripe.products.retrieve(priceId);
      const dp = product.default_price;
      if (!dp) {
        return res.status(400).json({ error: "Product has no default price. Use a price_ id." });
      }
      priceId = typeof dp === "string" ? dp : dp.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.FRONTEND_URL}/subscription-cancel`,
      metadata: { uid },
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err: any) {
    // Log รายละเอียดจาก Stripe ให้เห็นชัด ๆ
    console.error("[stripe] create-checkout failed:", err?.raw || err);
    const status = err?.statusCode || 500;
    return res.status(status).json({ error: err?.message || "Stripe error" });
  }
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

// (ไว้ทีหลัง) webhook — เวลาจริงควรใช้เพื่ออัปเดตสถานะบน Firestore
router.post("/webhook", async (_req, res) => {
  res.json({ ok: true, note: "Implement Stripe webhook verification in production." });
});

export default router;
