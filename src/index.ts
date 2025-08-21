// import express from "express";
// import cors from "cors";
// import { env } from "./config/envv";
// import "./config/firebase"; // init Firebase Admin
// import { errorHandler } from "./utils/error";
// import authRoutes from "./routes/authRoutes";
// import personaRoutes from "./routes/personaRoutes";
// import feedbackRoutes from "./routes/feedbackRoutes";
// import fileRoutes from "./routes/fileRoutes";
// import aiRoutes from "./routes/aiRoutes";
// import costRoutes from "./routes/costRoutes";
// import dotenv from "dotenv";

// dotenv.config();
// export const app = express();

// app.use(cors());
// app.use(express.json({ limit: "10mb" }));
// app.use(express.urlencoded({ extended: true }));

// app.get("/", (_req, res) => {
//   res.json({ ok: true, service: "soullinkai-backend", env: env.NODE_ENV });
// });

// app.use("/api/auth", authRoutes);
// app.use("/api/personas", personaRoutes);
// app.use("/api/feedback", feedbackRoutes);
// app.use("/api/files", fileRoutes);
// app.use("/api/ai", aiRoutes); // Grok (xAI)
// app.use("/api/cost", costRoutes); // Operating cost estimator

// // centralized error handler
// app.use(errorHandler);

// app.listen(env.PORT, () => {
//   console.log(`🚀 API running on http://localhost:${env.PORT}`);
// });


import express from "express";
import cors from "cors";
import { env } from "./config/envv";
import "./config/firebase";
import { errorHandler } from "./utils/error";

import authRoutes from "./routes/authRoutes";
import personaRoutes from "./routes/personaRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import fileRoutes from "./routes/fileRoutes";
import aiRoutes from "./routes/aiRoutes";
import costRoutes from "./routes/costRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import securityRoutes from "./routes/securityRoutes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "soullinkai-backend", env: env.NODE_ENV });
});

app.use("/api/auth", authRoutes);
app.use("/api/personas", personaRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/cost", costRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/security", securityRoutes);

// error handler
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 API running on http://localhost:${env.PORT}`);
});

export { app };
