import crypto from "crypto";
import { env } from "../config/envv";

// สร้าง key 32 bytes จาก SECRET_KEY (PBKDF2)
function getKey() {
  return crypto.pbkdf2Sync(env.SECRET_KEY, "aes-salt", 100000, 32, "sha256");
}

// AES-256-GCM
export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64"); // [IV(12)] [TAG(16)] [CIPHERTEXT]
}

export function decrypt(b64: string) {
  const data = Buffer.from(b64, "base64");
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const enc = data.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

// SHA-256 (ใช้แฮชคำตอบ/OTP)
export function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// แฮชคำตอบ Security Q ด้วย salt
export function hashAnswer(answer: string) {
  return sha256(env.SECURITY_HASH_SALT + ":" + answer);
}
