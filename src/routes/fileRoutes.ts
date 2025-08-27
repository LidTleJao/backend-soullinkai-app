

// import { Router } from "express";
// import multer from "multer";
// import { bucket, db, FieldValue } from "../config/firebase";
// import { requireAuth } from "../middlewares/authMiddleware";

// const router = Router();
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
// });

// // อัปโหลดรูป character (ต่อ personaId)
// router.post("/upload-image/:personaId", requireAuth, upload.single("file"), async (req, res, next) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "Missing file" });
//     const uid = (req as any).user.uid;
//     const personaId = req.params.personaId;

//     const filename = `users/${uid}/personas/${personaId}/images/${Date.now()}_${req.file.originalname}`;
//     const gcsFile = bucket.file(filename);

//     await gcsFile.save(req.file.buffer, {
//       contentType: req.file.mimetype,
//       resumable: false,
//       metadata: { cacheControl: "public, max-age=3600" },
//     });

//     const [url] = await gcsFile.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 60 * 60 * 1000, // 1 ชม.
//     });

//     // อัปเดต persona doc
//     await db.collection("personas").doc(personaId).set({
//       imagePath: filename,
//       imageUpdatedAt: FieldValue.serverTimestamp(),
//     }, { merge: true });

//     res.json({ path: filename, url });
//   } catch (err) {
//     next(err);
//   }
// });

// // บันทึก JSON ของ persona (เช่น personality/history)
// router.post("/save-json/:personaId", requireAuth, async (req, res, next) => {
//   try {
//     const uid = (req as any).user.uid;
//     const personaId = req.params.personaId;
//     const { json, kind } = req.body; // kind: "personality" | "history"

//     if (!json) return res.status(400).json({ error: "Missing json" });
//     const content = (typeof json === "string") ? json : JSON.stringify(json);

//     const fileName = `users/${uid}/personas/${personaId}/json/${kind || "data"}_${Date.now()}.json`;
//     const file = bucket.file(fileName);
//     await file.save(Buffer.from(content), {
//       contentType: "application/json",
//       resumable: false,
//       metadata: { cacheControl: "no-cache" },
//     });

//     await db.collection("personas").doc(personaId).set({
//       jsonFiles: FieldValue.arrayUnion({
//         kind: kind || "data",
//         path: fileName,
//         savedAt: FieldValue.serverTimestamp(),
//       })
//     }, { merge: true });

//     res.json({ ok: true, path: fileName });
//   } catch (err) {
//     next(err);
//   }
// });

// export default router;

// src/routes/fileRoutes.ts
import { Router } from "express";
import { db, FieldValue, bucket } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
const COL = "personas";

// POST /files/save-json/:id
router.post("/save-json/:id", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const id = req.params.id;
    let { json, kind } = req.body as { json: any; kind?: string };

    if (!id) return res.status(400).json({ error: "Missing persona id" });
    if (!json) return res.status(400).json({ error: "Missing json" });
    if (!kind) kind = "personality"; // default
    if (!["personality", "history"].includes(kind))
      return res.status(400).json({ error: "Invalid kind" });

    // ตรวจ persona + สิทธิ์
    const ref = db.collection(COL).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Persona not found" });
    if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    // ถ้า client ส่งมาเป็น string -> ต้อง parse ก่อน
    let obj: any;
    try {
      obj = typeof json === "string" ? JSON.parse(json) : json;
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const content = JSON.stringify(obj, null, 2);

    // path เก็บลง Firebase Storage
    const filePath = `personas/${uid}/${id}/${kind}.json`;
    await bucket.file(filePath).save(content, {
      contentType: "application/json; charset=utf-8",
      resumable: false,
      public: false,
    });

    // อัปเดต metadata ที่ persona (เก็บรายการไฟล์ไว้ด้วย)
    await ref.set(
      {
        updatedAt: FieldValue.serverTimestamp(),
        jsonFiles: FieldValue.arrayUnion({
          kind,
          path: filePath,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      },
      { merge: true }
    );

    res.json({ ok: true, path: filePath });
  } catch (err) {
    next(err);
  }
});

export default router;
