import { db, FieldValue } from "../config/firebase";
import { env } from "../config/envv";
import { sha256 } from "./encrypt";

export function generateOTP(length = 6) {
  const digits = "0123456789";
  let out = "";
  for (let i = 0; i < length; i++) out += digits[Math.floor(Math.random() * 10)];
  return out;
}

export async function createOtpForUser(uid: string) {
  const code = generateOTP(6);
  const now = Date.now();
  const expiresAt = new Date(now + env.OTP_TTL_MINUTES * 60 * 1000);
  const codeHash = sha256(code);

  await db.collection("otps").add({
    uid,
    codeHash,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    used: false,
    attempts: 0,
  });

  return { code, expiresAt };
}

export async function verifyOtp(uid: string, code: string) {
  const codeHash = sha256(code);
  const snap = await db.collection("otps")
    .where("uid", "==", uid)
    .where("used", "==", false)
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  const now = new Date();

  for (const doc of snap.docs) {
    const data = doc.data() as any;
    const ref = doc.ref;

    // หมดอายุ
    if (data.expiresAt?.toDate && data.expiresAt.toDate() < now) {
      await ref.update({ used: true });
      continue;
    }

    // ตรวจ hash
    if (data.codeHash === codeHash) {
      await ref.update({ used: true });
      return true;
    } else {
      await ref.update({ attempts: (data.attempts || 0) + 1 });
    }
  }
  return false;
}
