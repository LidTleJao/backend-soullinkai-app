import { Router } from "express";
import { db } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/adminMiddleware";

const router = Router();

/** helper: parse int with default */
function toInt(v: any, d = 10) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : d;
}

/** helper: สร้างช่วงวัน (UTC) */
function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}
function endOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** GET /admin/stats
 *  - users: จำนวนผู้ใช้ใน collection "users"
 *  - personas: จำนวนใน "personas"
 *  - subscriptions: users ที่ subscription.status == "active"
 *  - aiRequests: จำนวนเอกสารวันนี้ใน "ai_logs"
 */
router.get("/stats", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [usersSnap, personasSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("personas").get(),
    ]);

    // subscriptions (active)
    const activeSubSnap = await db.collection("users")
      .where("subscription.status", "==", "active")
      .get();

    // ai requests today
    const now = new Date();
    const s = startOfDayUTC(now);
    const e = endOfDayUTC(now);
    const aiTodaySnap = await db.collection("ai_logs")
      .where("createdAt", ">=", s)
      .where("createdAt", "<=", e)
      .get();

    res.json({
      users: usersSnap.size,
      personas: personasSnap.size,
      subscriptions: activeSubSnap.size,
      aiRequests: aiTodaySnap.size,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /admin/ai-usage?days=14
 *  คืน array [{ date: 'YYYY-MM-DD', tokens: number, requests: number }]
 *  อ่านจากคอลเล็กชัน ai_logs (รูปแบบเอกสารที่คาดหวัง: { uid, tokens, createdAt })
 */
router.get("/ai-usage", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const days = toInt(req.query.days, 14);
    const end = endOfDayUTC(new Date());
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - (days - 1)); // รวมวันนี้

    const logsSnap = await db.collection("ai_logs")
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", end)
      .orderBy("createdAt", "asc")
      .get();

    // aggregate by day
    const map: Record<string, { tokens: number; requests: number }> = {};
    logsSnap.forEach(doc => {
      const d = doc.data() as any;
      const ts: Date = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt;
      if (!ts) return;
      const key = ts.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!map[key]) map[key] = { tokens: 0, requests: 0 };
      map[key].tokens += Number(d.tokens || 0);
      map[key].requests += 1;
    });

    // fill missing days with zeros
    const out: Array<{ date: string; tokens: number; requests: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      out.push({
        date: key,
        tokens: map[key]?.tokens || 0,
        requests: map[key]?.requests || 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    res.json(out);
  } catch (err) {
    next(err);
  }
});

/** GET /admin/revenue?months=6
 *  คืน array [{ month: 'YYYY-MM', amount: number }]
 *  ถ้ามีคอลเล็กชัน payments (เช่นบันทึกจาก Stripe webhook) จะอ่านจริง
 *  ไม่มีก็ประเมินจากจำนวน active subscriptions * PRICE (อ่านจาก env หรือ fix ค่า)
 */
router.get("/revenue", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const months = toInt(req.query.months, 6);
    const PRICE = Number(process.env.ADMIN_REPORT_PRICE_USD || 10); // default ประเมิน $10/เดือน/โปร

    // (A) พยายามอ่านจาก payments ก่อน
    const paymentsSnap = await db.collection("payments")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .get();

    const byMonth: Record<string, number> = {};

    if (!paymentsSnap.empty) {
      paymentsSnap.forEach(doc => {
        const d = doc.data() as any;
        const ts: Date = d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt;
        if (!ts) return;
        const key = ts.toISOString().slice(0, 7); // YYYY-MM
        byMonth[key] = (byMonth[key] || 0) + Number(d.amount || 0);
      });
    } else {
      // (B) ไม่มี payments — ประเมินจากจำนวน active subscriptions ปัจจุบัน (เดือนล่าสุด)
      const activeSnap = await db.collection("users")
        .where("subscription.status", "==", "active")
        .get();
      const now = new Date();
      const key = now.toISOString().slice(0, 7);
      byMonth[key] = (activeSnap.size || 0) * PRICE;
    }

    // ส่งเฉพาะ N เดือนล่าสุด (ถ้ามีไม่ครบให้เติม 0)
    const out: Array<{ month: string; amount: number }> = [];
    const cursor = new Date();
    for (let i = 0; i < months; i++) {
      const key = cursor.toISOString().slice(0, 7);
      out.unshift({ month: key, amount: byMonth[key] || 0 });
      // previous month
      cursor.setUTCMonth(cursor.getUTCMonth() - 1);
    }
    res.json(out);
  } catch (err) {
    next(err);
  }
});

/** GET /admin/users?limit=20&cursor=<docId>
 *  คืนรายการผู้ใช้แบบง่าย ๆ
 */
router.get("/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit = toInt(req.query.limit, 20);
    const cursor = (req.query.cursor as string) || null;

    let q = db.collection("users").orderBy("createdAt", "desc").limit(limit);
    if (cursor) {
      const curDoc = await db.collection("users").doc(cursor).get();
      if (curDoc.exists) q = q.startAfter(curDoc);
    }
    const snap = await q.get();

    const items = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    }));

    res.json({
      items,
      nextCursor: snap.docs.length ? snap.docs[snap.docs.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /admin/personas?limit=20&cursor=<docId> */
router.get("/personas", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit = toInt(req.query.limit, 20);
    const cursor = (req.query.cursor as string) || null;

    let q = db.collection("personas").orderBy("createdAt", "desc").limit(limit);
    if (cursor) {
      const curDoc = await db.collection("personas").doc(cursor).get();
      if (curDoc.exists) q = q.startAfter(curDoc);
    }
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      items,
      nextCursor: snap.docs.length ? snap.docs[snap.docs.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /admin/feedback?limit=20&cursor=<docId> */
router.get("/feedback", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const limit = toInt(req.query.limit, 20);
    const cursor = (req.query.cursor as string) || null;

    let q = db.collection("feedback").orderBy("createdAt", "desc").limit(limit);
    if (cursor) {
      const curDoc = await db.collection("feedback").doc(cursor).get();
      if (curDoc.exists) q = q.startAfter(curDoc);
    }
    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({
      items,
      nextCursor: snap.docs.length ? snap.docs[snap.docs.length - 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
