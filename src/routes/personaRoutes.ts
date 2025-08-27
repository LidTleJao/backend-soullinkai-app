

// src/routes/personaRoutes.ts
import { Router } from "express";
import { db, FieldValue, bucket } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
const COL = "personas";

// helper: generate signed URL จาก imagePath (หมดอายุใน 1 ชม.)
async function signedUrlFor(path?: string | null) {
  if (!path) return null;
  try {
    const [url] = await bucket.file(path).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hr
    });
    return url;
  } catch (e) {
    console.warn("[personaRoutes] signedUrl error:", (e as any)?.message);
    return null;
  }
}

// ✅ list ของผู้ใช้ + แนบ imageUrl
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;

    let snap;
    try {
      snap = await db
        .collection(COL)
        .where("ownerUid", "==", uid)
        .orderBy("createdAt", "desc")
        .get();
    } catch (e: any) {
      console.warn("[personas] orderBy failed, fallback w/o orderBy:", e?.message);
      snap = await db.collection(COL).where("ownerUid", "==", uid).get();
    }

    const itemsRaw = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
    const items = await Promise.all(
      itemsRaw.map(async (it) => ({
        ...it,
        imageUrl: await signedUrlFor(it.imagePath),
      }))
    );

    res.json(items);
  } catch (err) {
    next(err);
  }
});

// ✅ create (เดิม)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const data = {
      ownerUid: uid,
      name: req.body.name,
      description: req.body.description || "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      jsonFiles: [],
      imagePath: null,
    };
    const ref = await db.collection(COL).add(data);
    res.json({ id: ref.id, ...data });
  } catch (err) {
    next(err);
  }
});

// ✅ (ใหม่) get persona by id + แนบ imageUrl
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const id = req.params.id;

    const ref = db.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });

    const data = snap.data() as any;
    if (data?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    const imageUrl = await signedUrlFor(data.imagePath);
    res.json({ id, ...data, imageUrl });
  } catch (err) {
    next(err);
  }
});

// ✅ update (เดิม)
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const id = req.params.id;
    const ref = db.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });
    if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    const patch = {
      name: req.body.name,
      description: req.body.description,
      updatedAt: FieldValue.serverTimestamp(),
    };
    await ref.update(patch);
    res.json({ id, ...patch });
  } catch (err) {
    next(err);
  }
});

// ✅ delete (เดิม)
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const id = req.params.id;
    const ref = db.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Not found" });
    if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
