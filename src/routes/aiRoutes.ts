// import { Router } from "express";
// import axios from "axios";
// import { env } from "../config/envv";

// const router = Router();
// const client = axios.create({
//   baseURL: env.XAI_BASE_URL,
//   headers: {
//     "Authorization": `Bearer ${env.XAI_API_KEY}`,
//     "Content-Type": "application/json"
//   },
//   timeout: 60000
// });

// // เรียก Grok chat completion
// router.post("/chat", async (req, res, next) => {
//   try {
//     const { messages, model } = req.body;

//     const payload = {
//       model: model || env.XAI_MODEL, // เช่น "grok-2-latest"
//       messages: messages || [{ role: "user", content: "Hello Grok" }],
//       temperature: 0.7,
//       stream: false
//     };

//     const r = await client.post("/chat/completions", payload);
//     res.json(r.data);
//   } catch (err: any) {
//     if (err.response) {
//       return res.status(err.response.status).json(err.response.data);
//     }
//     next(err);
//   }
// });

// export default router;


import { Router } from "express";
import axios from "axios";
import { env } from "../config/envv";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

const client = axios.create({
  baseURL: env.XAI_BASE_URL,
  headers: {
    "Authorization": `Bearer ${env.XAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// Summarize & convert to JSON (core flow ของลูกค้า)
router.post("/summarize", requireAuth, async (req, res, next) => {
  try {
    const { text, mode } = req.body;
    // mode: "history" | "personality"
    const system = (mode === "personality")
      ? "You are a helpful assistant that extracts a structured Personality JSON from user's text."
      : "You are a helpful assistant that extracts a structured History JSON from user's text.";

    const messages = [
      { role: "system", content: system },
      { role: "user", content: `Please summarize and output valid JSON only (no markdown). Text:\n${text}` },
    ];

    const payload = {
      model: env.XAI_MODEL,
      messages,
      temperature: 0.2,
      stream: false,
    };

    const r = await client.post("/chat/completions", payload);
    res.json(r.data);
  } catch (err: any) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
});

// generic chat
router.post("/chat", requireAuth, async (req, res, next) => {
  try {
    const { messages, model } = req.body;
    const payload = {
      model: model || env.XAI_MODEL,
      messages: messages || [{ role: "user", content: "Hello Grok" }],
      temperature: 0.7,
      stream: false,
    };
    const r = await client.post("/chat/completions", payload);
    res.json(r.data);
  } catch (err: any) {
    if (err.response) return res.status(err.response.status).json(err.response.data);
    next(err);
  }
});

export default router;
