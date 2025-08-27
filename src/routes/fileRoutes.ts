// // src/routes/fileRoutes.ts
// import { Router } from "express";
// import { db, FieldValue, bucket } from "../config/firebase";
// import { requireAuth } from "../middlewares/authMiddleware";

// const router = Router();
// const COL = "personas";

// router.post("/save-json/:personaId", requireAuth, async (req, res) => {
//   const uid = (req as any).user.uid;
//   const personaId = req.params.personaId;
//   let { json, kind } = req.body as { json: any; kind?: "personality"|"history" };

//   try {
//     if (!personaId) return res.status(400).json({ error: "Missing persona id" });
//     if (!json) return res.status(400).json({ error: "Missing json" });
//     if (!kind) kind = "personality";
//     if (!["personality","history"].includes(kind))
//       return res.status(400).json({ error: "Invalid kind" });

//     // ตรวจสิทธิ์ persona
//     const ref = db.collection(COL).doc(personaId);
//     const snap = await ref.get();
//     if (!snap.exists) return res.status(404).json({ error: "Persona not found" });
//     if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

//     // แปลง JSON
//     let objectJson: any;
//     try {
//       objectJson = typeof json === "string" ? JSON.parse(json) : json;
//     } catch (e) {
//       return res.status(400).json({ error: "Invalid JSON" });
//     }

//     const content = JSON.stringify(objectJson, null, 2);
//     const filePath = `personas/${uid}/${personaId}/${kind}.json`;

//     await bucket.file(filePath).save(Buffer.from(content), {
//       contentType: "application/json; charset=utf-8",
//       resumable: false,
//     });

//     await ref.set(
//       {
//         updatedAt: FieldValue.serverTimestamp(),
//         jsonFiles: FieldValue.arrayUnion({
//           kind,
//           path: filePath,
//           updatedAt: FieldValue.serverTimestamp(),
//         }),
//       },
//       { merge: true }
//     );

//     return res.json({ ok: true, path: filePath });
//   } catch (err: any) {
//     console.error("[save-json] error:", err?.message, err);
//     // ส่งข้อความออกไปให้ดีบัคได้
//     return res.status(500).json({ error: "save-json failed", detail: err?.message || String(err) });
//   }
// });

// export default router;

// src/routes/fileRoutes.ts
import { Router } from "express";
import { db, FieldValue, bucket } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
const COL = "personas";

router.post("/save-json/:personaId", requireAuth, async (req, res) => {
  const uid = (req as any).user.uid;
  const personaId = req.params.personaId;
  let { json, kind } = req.body as { json: any; kind?: "history" | "personality" };

  try {
    if (!personaId) return res.status(400).json({ error: "Missing persona id" });
    if (!json) return res.status(400).json({ error: "Missing json" });
    if (!kind) kind = "personality";
    if (!["history", "personality"].includes(kind))
      return res.status(400).json({ error: "Invalid kind" });

    // ตรวจ persona + สิทธิ์
    const ref = db.collection(COL).doc(personaId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Persona not found" });
    if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    // parse JSON (รับทั้ง string/object)
    let obj: any;
    try {
      obj = typeof json === "string" ? JSON.parse(json) : json;
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    const content = JSON.stringify(obj, null, 2);
    const filePath = `personas/${uid}/${personaId}/${kind}.json`;

    await bucket.file(filePath).save(Buffer.from(content), {
      contentType: "application/json; charset=utf-8",
      resumable: false,
    });

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

    return res.json({ ok: true, path: filePath });
  } catch (err: any) {
    console.error("[save-json] error:", err?.message, err);
    return res
      .status(500)
      .json({ error: "save-json failed", detail: err?.message || String(err) });
  }
});

export default router;
