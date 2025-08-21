// import { Router } from "express";
// import { db, FieldValue } from "../config/firebase";
// import { requireAuth } from "../middlewares/authMiddleware";

// const router = Router();
// const COL = "personas";

// // list ของผู้ใช้คนนี้
// router.get("/", requireAuth, async (req, res, next) => {
//   try {
//     const uid = (req as any).user.uid;
//     const snap = await db.collection(COL).where("ownerUid", "==", uid).orderBy("createdAt", "desc").get();
//     const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//     res.json(items);
//   } catch (err) {
//     next(err);
//   }
// });

// // create
// router.post("/", requireAuth, async (req, res, next) => {
//   try {
//     const uid = (req as any).user.uid;
//     const data = {
//       ownerUid: uid,
//       name: req.body.name,
//       description: req.body.description || "",
//       createdAt: FieldValue.serverTimestamp(),
//       updatedAt: FieldValue.serverTimestamp(),
//     };
//     const ref = await db.collection(COL).add(data);
//     res.json({ id: ref.id, ...data });
//   } catch (err) {
//     next(err);
//   }
// });

// // update
// router.put("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const uid = (req as any).user.uid;
//     const id = req.params.id;
//     const ref = db.collection(COL).doc(id);
//     const snap = await ref.get();
//     if (!snap.exists) return res.status(404).json({ error: "Not found" });
//     if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

//     const patch = {
//       name: req.body.name,
//       description: req.body.description,
//       updatedAt: FieldValue.serverTimestamp(),
//     };
//     await ref.update(patch);
//     res.json({ id, ...patch });
//   } catch (err) {
//     next(err);
//   }
// });

// // delete
// router.delete("/:id", requireAuth, async (req, res, next) => {
//   try {
//     const uid = (req as any).user.uid;
//     const id = req.params.id;
//     const ref = db.collection(COL).doc(id);
//     const snap = await ref.get();
//     if (!snap.exists) return res.status(404).json({ error: "Not found" });
//     if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

//     await ref.delete();
//     res.json({ ok: true });
//   } catch (err) {
//     next(err);
//   }
// });

// export default router;


import { Router } from "express";
import { db, FieldValue } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
const COL = "personas";

// list ของผู้ใช้
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const snap = await db.collection(COL)
      .where("ownerUid", "==", uid)
      .orderBy("createdAt", "desc").get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) { next(err); }
});

// create
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
  } catch (err) { next(err); }
});

// update
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
  } catch (err) { next(err); }
});

// delete
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
  } catch (err) { next(err); }
});

export default router;
