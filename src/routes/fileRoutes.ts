// import { Router } from "express";
// import multer from "multer";
// import { bucket } from "../config/firebase";

// const router = Router();
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// router.post("/upload", upload.single("file"), async (req, res, next) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "Missing file" });

//     const gcsFile = bucket.file(`uploads/${Date.now()}_${req.file.originalname}`);
//     await gcsFile.save(req.file.buffer, {
//       contentType: req.file.mimetype,
//       resumable: false,
//       metadata: { cacheControl: "public, max-age=3600" }
//     });

//     // signed URL 1 ชั่วโมง
//     const [url] = await gcsFile.getSignedUrl({
//       action: "read",
//       expires: Date.now() + 60 * 60 * 1000,
//     });

//     res.json({ name: gcsFile.name, url });
//   } catch (err) {
//     next(err);
//   }
// });

// export default router;


import { Router } from "express";
import multer from "multer";
import { bucket, db, FieldValue } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// อัปโหลดรูป character (ต่อ personaId)
router.post("/upload-image/:personaId", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing file" });
    const uid = (req as any).user.uid;
    const personaId = req.params.personaId;

    const filename = `users/${uid}/personas/${personaId}/images/${Date.now()}_${req.file.originalname}`;
    const gcsFile = bucket.file(filename);

    await gcsFile.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: { cacheControl: "public, max-age=3600" },
    });

    const [url] = await gcsFile.getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 ชม.
    });

    // อัปเดต persona doc
    await db.collection("personas").doc(personaId).set({
      imagePath: filename,
      imageUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ path: filename, url });
  } catch (err) {
    next(err);
  }
});

// บันทึก JSON ของ persona (เช่น personality/history)
router.post("/save-json/:personaId", requireAuth, async (req, res, next) => {
  try {
    const uid = (req as any).user.uid;
    const personaId = req.params.personaId;
    const { json, kind } = req.body; // kind: "personality" | "history"

    if (!json) return res.status(400).json({ error: "Missing json" });
    const content = (typeof json === "string") ? json : JSON.stringify(json);

    const fileName = `users/${uid}/personas/${personaId}/json/${kind || "data"}_${Date.now()}.json`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(content), {
      contentType: "application/json",
      resumable: false,
      metadata: { cacheControl: "no-cache" },
    });

    await db.collection("personas").doc(personaId).set({
      jsonFiles: FieldValue.arrayUnion({
        kind: kind || "data",
        path: fileName,
        savedAt: FieldValue.serverTimestamp(),
      })
    }, { merge: true });

    res.json({ ok: true, path: fileName });
  } catch (err) {
    next(err);
  }
});

export default router;
