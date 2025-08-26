// import { Router } from "express";
// import axios from "axios";
// import { env } from "../config/envv";
// import { requireAuth } from "../middlewares/authMiddleware";

// const router = Router();

// const client = axios.create({
//   baseURL: env.XAI_BASE_URL,
//   headers: {
//     "Authorization": `Bearer ${env.XAI_API_KEY}`,
//     "Content-Type": "application/json",
//   },
//   timeout: 60000,
// });

// // Summarize & convert to JSON (core flow ของลูกค้า)
// router.post("/summarize", requireAuth, async (req, res, next) => {
//   try {
//     const { text, mode } = req.body;
//     // mode: "history" | "personality"
//     const system = (mode === "personality")
//       ? "You are a helpful assistant that extracts a structured Personality JSON from user's text."
//       : "You are a helpful assistant that extracts a structured History JSON from user's text.";

//     const messages = [
//       { role: "system", content: system },
//       { role: "user", content: `Please summarize and output valid JSON only (no markdown). Text:\n${text}` },
//     ];

//     const payload = {
//       model: env.XAI_MODEL,
//       messages,
//       temperature: 0.2,
//       stream: false,
//     };

//     const r = await client.post("/chat/completions", payload);
//     res.json(r.data);
//   } catch (err: any) {
//     if (err.response) return res.status(err.response.status).json(err.response.data);
//     next(err);
//   }
// });

// // generic chat
// router.post("/chat", requireAuth, async (req, res, next) => {
//   try {
//     const { messages, model } = req.body;
//     const payload = {
//       model: model || env.XAI_MODEL,
//       messages: messages || [{ role: "user", content: "Hello Grok" }],
//       temperature: 0.7,
//       stream: false,
//     };
//     const r = await client.post("/chat/completions", payload);
//     res.json(r.data);
//   } catch (err: any) {
//     if (err.response) return res.status(err.response.status).json(err.response.data);
//     next(err);
//   }
// });

// export default router;

// src/routes/aiRoutes.ts
import { Router } from "express";
import axios from "axios";
import { env } from "../config/envv";
import { requireAuth } from "../middlewares/authMiddleware";
import { db, FieldValue } from "../config/firebase";

const router = Router();

const client = axios.create({
  baseURL: env.XAI_BASE_URL, // เช่น https://api.x.ai/v1
  headers: {
    Authorization: `Bearer ${env.XAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// helper: ประมาณ token จากความยาวตัวอักษร
const approxTokensFromText = (text: string) =>
  Math.ceil(((text || "").length || 0) / 4);

// Summarize & convert to JSON (core flow ของลูกค้า)
router.post("/summarize", requireAuth, async (req, res, next) => {
  try {
    const { text = "", mode } = req.body as {
      text: string;
      mode?: "history" | "personality";
    };

    const system =
      mode === "personality"
        ? "You are a helpful assistant that extracts a structured Personality JSON from user's text."
        : "You are a helpful assistant that extracts a structured History JSON from user's text.";

    const messages = [
      { role: "system", content: system },
      {
        role: "user",
        content:
          "Please summarize and output valid JSON only (no markdown). Text:\n" +
          text,
      },
    ];

    const payload = {
      model: env.XAI_MODEL, // เช่น grok-2-latest
      messages,
      temperature: 0.2,
      stream: false,
    };

    const r = await client.post("/chat/completions", payload);

    // --------- LOG AI USAGE ----------
    try {
      const uid = (req as any).user?.uid || null;
      const usage = r.data?.usage || {};
      // รองรับได้หลายรูปแบบ
      const totalTokens =
        Number(
          usage.total_tokens ?? usage.totalTokens ?? usage.tokens ?? undefined
        ) || approxTokensFromText(text);

      await db.collection("ai_logs").add({
        uid,
        model: env.XAI_MODEL,
        mode: mode || "history",
        tokens: totalTokens,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logErr) {
      // ไม่ให้ logging พัง flow หลัก
      console.warn("[ai-usage log error]", logErr);
    }
    // ----------------------------------

    res.json(r.data);
  } catch (err: any) {
    if (err.response)
      return res.status(err.response.status).json(err.response.data);
    next(err);
  }
});

// generic chat
router.post("/chat", requireAuth, async (req, res, next) => {
  try {
    const { messages = [{ role: "user", content: "Hello Grok" }], model } =
      req.body as {
        messages: Array<{ role: string; content: string }>;
        model?: string;
      };

    const payload = {
      model: model || env.XAI_MODEL,
      messages,
      temperature: 0.7,
      stream: false,
    };

    const r = await client.post("/chat/completions", payload);

    // --------- LOG AI USAGE ----------
    try {
      const uid = (req as any).user?.uid || null;
      const usage = r.data?.usage || {};
      // พยายามใช้ usage ที่มาจาก API ถ้าไม่มีให้ประมาณจากข้อความทั้งหมด
      const concat = messages?.map((m) => m?.content || "").join(" ") || "";
      const approx = approxTokensFromText(concat);

      const totalTokens =
        Number(
          usage.total_tokens ?? usage.totalTokens ?? usage.tokens ?? undefined
        ) || approx;

      await db.collection("ai_logs").add({
        uid,
        model: model || env.XAI_MODEL,
        tokens: totalTokens,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (logErr) {
      console.warn("[ai-usage log error]", logErr);
    }
    // ----------------------------------

    res.json(r.data);
  } catch (err: any) {
    if (err.response)
      return res.status(err.response.status).json(err.response.data);
    next(err);
  }
});

export default router;
