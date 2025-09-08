// src/routes/fileRoutes.ts
import { Router } from "express";
import multer from "multer";
import { db, FieldValue, bucket } from "../config/firebase";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();
console.log("Bucket in use:", bucket.name);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const COL = "personas";

function formatTimestamp(d = new Date()) {
  // 26/08/2025 3:12pm
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const ampm = hh >= 12 ? "pm" : "am";
  hh = hh % 12 || 12;
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}${ampm}`;
}

/** helper: สร้าง signed URL อ่านไฟล์ (หมดอายุ 1 ชม.) */
async function getSignedUrl(path: string) {
  const [url] = await bucket.file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });
  return url;
}

/** -------------------- upload image -------------------- */
router.post(
  "/upload-image/:personaId",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const uid = (req as any).user.uid;
    const personaId = req.params.personaId;

    try {
      if (!req.file) return res.status(400).json({ error: "Missing file" });
      if (!personaId)
        return res.status(400).json({ error: "Missing persona id" });

      const ref = db.collection(COL).doc(personaId);
      const snap = await ref.get();
      if (!snap.exists)
        return res.status(404).json({ error: "Persona not found" });
      if (snap.data()?.ownerUid !== uid)
        return res.status(403).json({ error: "Forbidden" });

      const safeName =
        (req.file.originalname || "image").replace(/[^\w.\-]+/g, "_") ||
        `image_${Date.now()}.bin`;
      const filePath = `users/${uid}/personas/${personaId}/images/${Date.now()}_${safeName}`;

      await bucket.file(filePath).save(req.file.buffer, {
        contentType: req.file.mimetype || "application/octet-stream",
        resumable: false,
        metadata: { cacheControl: "public, max-age=3600" },
      });

      await ref.set(
        {
          imagePath: filePath,
          imageUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const url = await getSignedUrl(filePath);
      return res.json({ ok: true, path: filePath, url });
    } catch (err: any) {
      console.error("[upload-image] error:", err?.message, err);
      return res
        .status(500)
        .json({
          error: "upload-image failed",
          detail: err?.message || String(err),
        });
    }
  }
);

/** -------------------- save json (personality/history/memory) -------------------- */
router.post("/save-json/:personaId", requireAuth, async (req, res) => {
  const uid = (req as any).user.uid;
  const personaId = req.params.personaId;
  let { json, kind } = req.body as {
    json: any;
    kind?: "history" | "personality" | "memory";
  };

  try {
    if (!personaId)
      return res.status(400).json({ error: "Missing persona id" });
    if (!json) return res.status(400).json({ error: "Missing json" });

    // ✅ รองรับ memory เพิ่มเข้ามา
    const ALLOWED: Array<"history" | "personality" | "memory"> = [
      "history",
      "personality",
      "memory",
    ];
    if (!kind) kind = "personality";
    if (!ALLOWED.includes(kind))
      return res.status(400).json({ error: "Invalid kind" });

    // ตรวจ persona + สิทธิ์
    const ref = db.collection(COL).doc(personaId);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ error: "Persona not found" });
    if (snap.data()?.ownerUid !== uid)
      return res.status(403).json({ error: "Forbidden" });

    // แปลง input ให้เป็น object ก่อน
    let obj: any;
    try {
      obj = typeof json === "string" ? JSON.parse(json) : json;
    } catch {
      // ถ้า parse ไม่ได้ และเป็น kind=memory => สร้างโครงจาก text ให้เลย
      if (kind === "memory") {
        const text = String(json);
        obj = [
          {
            summary: text,
            "speaker 1": "user",
            "intend&emotions 1": "",
            "speaker 2": "AI",
            "intend&emotions 2": "",
            timestamp: formatTimestamp(),
          },
        ];
      } else {
        return res.status(400).json({ error: "Invalid JSON" });
      }
    }

    // บังคับ memory ให้อยู่เป็น array (ตามสเปคใหม่)
    if (kind === "memory" && !Array.isArray(obj)) {
      obj = [obj];
      if (!obj[0].timestamp) obj[0].timestamp = formatTimestamp();
    }

    const content = JSON.stringify(obj, null, 2);
    const filePath = `users/${uid}/personas/${personaId}/json/${kind}.json`;

    await bucket.file(filePath).save(Buffer.from(content), {
      contentType: "application/json; charset=utf-8",
      resumable: false,
      metadata: { cacheControl: "no-cache" },
    });

    // await ref.set(
    //   {
    //     updatedAt: FieldValue.serverTimestamp(),
    //     jsonFiles: FieldValue.arrayUnion({
    //       kind,
    //       path: filePath,
    //       updatedAt: FieldValue.serverTimestamp(),
    //     }),
    //   },
    //   { merge: true }
    // );
    await ref.set(
      {
        updatedAt: FieldValue.serverTimestamp(), // ✅ ได้
        jsonFiles: FieldValue.arrayUnion({
          kind,
          path: filePath,
          updatedAt: new Date(), // ✅ ได้ (ไม่ใช่ serverTimestamp)
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

// --- LIST ไฟล์ JSON ของ persona ---
router.get("/list-json/:personaId", requireAuth, async (req, res) => {
  const uid = (req as any).user.uid;
  const personaId = req.params.personaId;

  try {
    if (!personaId) return res.status(400).json({ error: "Missing persona id" });

    const ref = db.collection(COL).doc(personaId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Persona not found" });

    const data = snap.data() as any;
    if (data?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    const items = Array.isArray(data?.jsonFiles) ? data.jsonFiles : [];
    // แน่ใจว่ามีเฉพาะ kind ที่รองรับ
    const allowed = new Set(["personality", "history", "memory"]);
    const rows = await Promise.all(
      items
        .filter((it: any) => it?.path && allowed.has(it?.kind))
        .map(async (it: any) => {
          let signedUrl: string | null = null;
          try {
            signedUrl = await getSignedUrl(it.path);
          } catch {
            signedUrl = null;
          }
          return {
            kind: it.kind,
            path: it.path,
            updatedAt: it.updatedAt?.toDate
              ? it.updatedAt.toDate().toISOString()
              : it.updatedAt || null,
            signedUrl,
          };
        })
    );

    // เรียงล่าสุดก่อน (ถ้ามี updatedAt)
    rows.sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return res.json(rows);
  } catch (err: any) {
    console.error("[list-json] error:", err?.message, err);
    return res
      .status(500)
      .json({ error: "list-json failed", detail: err?.message || String(err) });
  }
});

// --- อ่านเนื้อหาไฟล์ JSON ตาม kind ---
router.get("/json/:personaId/:kind", requireAuth, async (req, res) => {
  const uid = (req as any).user.uid;
  const { personaId, kind } = req.params as { personaId: string; kind: "personality" | "history" | "memory" };

  try {
    if (!personaId) return res.status(400).json({ error: "Missing persona id" });
    if (!["personality", "history", "memory"].includes(kind))
      return res.status(400).json({ error: "Invalid kind" });

    const ref = db.collection(COL).doc(personaId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Persona not found" });
    if (snap.data()?.ownerUid !== uid) return res.status(403).json({ error: "Forbidden" });

    const filePath = `users/${uid}/personas/${personaId}/json/${kind}.json`;
    const file = bucket.file(filePath);

    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    const [buf] = await file.download(); // Buffer
    // ส่งกลับเป็นข้อความ (ให้ฝั่งหน้าอ่าน/แสดงเอง)
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.send(buf.toString("utf8"));
  } catch (err: any) {
    console.error("[get-json] error:", err?.message, err);
    return res
      .status(500)
      .json({ error: "get-json failed", detail: err?.message || String(err) });
  }
});



export default router;
