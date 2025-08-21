import dotenv from "dotenv";
dotenv.config();

export const env = {
  // Server
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || "development",

  // Firebase Admin
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "",
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || "",
  FIREBASE_PRIVATE_KEY: (() => {
    if (process.env.FIREBASE_PRIVATE_KEY_BASE64) {
      return Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8");
    }
    const key = process.env.FIREBASE_PRIVATE_KEY || "";
    return key.replace(/\\n/g, "\n");
  })(),
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "",

  // xAI (Grok)
  XAI_API_KEY: process.env.XAI_API_KEY || process.env.GROK_API_KEY || "",
  XAI_MODEL: process.env.XAI_MODEL || process.env.GROK_MODEL || "grok-2-latest",
  XAI_BASE_URL: process.env.XAI_BASE_URL || process.env.GROK_API_BASE || "https://api.x.ai/v1",

  // Encryption
  SECRET_KEY: process.env.SECRET_KEY || "change_me_in_prod", // AES-256 key seed
  SECURITY_HASH_SALT: process.env.SECURITY_HASH_SALT || "salt_change_me", // for hashing answers
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES || 5),

  // Subscription / Payment
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PRICE_ID_PRO: process.env.STRIPE_PRICE_ID_PRO || "", // ใส่ price_xxx ของ plan PRO
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // Cost Estimation defaults (ปรับได้)
  DEFAULT_MODEL_COST_PER_1K_TOKENS: Number(process.env.DEFAULT_MODEL_COST_PER_1K_TOKENS || 0.002),
  DEFAULT_STORAGE_COST_PER_GB: Number(process.env.DEFAULT_STORAGE_COST_PER_GB || 0.026),
  DEFAULT_EGRESS_COST_PER_GB: Number(process.env.DEFAULT_EGRESS_COST_PER_GB || 0.12),
  DEFAULT_READ_COST_PER_100K: Number(process.env.DEFAULT_READ_COST_PER_100K || 0.06),
  DEFAULT_WRITE_COST_PER_100K: Number(process.env.DEFAULT_WRITE_COST_PER_100K || 0.18),
  DEFAULT_DELETE_COST_PER_100K: Number(process.env.DEFAULT_DELETE_COST_PER_100K || 0.02),
};

// แจ้งเตือน env ที่จำเป็น
["FIREBASE_PROJECT_ID","FIREBASE_CLIENT_EMAIL","FIREBASE_PRIVATE_KEY"].forEach(k=>{
  if (!(env as any)[k]) console.warn(`[env] Missing ${k}. Check your .env`);
});
