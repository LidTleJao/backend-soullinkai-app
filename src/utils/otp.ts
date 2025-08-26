// import { db, FieldValue } from "../config/firebase";
// import { env } from "../config/envv";
// import { sha256 } from "./encrypt";

// export function generateOTP(length = 6) {
//   const digits = "0123456789";
//   let out = "";
//   for (let i = 0; i < length; i++) out += digits[Math.floor(Math.random() * 10)];
//   return out;
// }

// export async function createOtpForUser(uid: string) {
//   const code = generateOTP(6);
//   const now = Date.now();
//   const expiresAt = new Date(now + env.OTP_TTL_MINUTES * 60 * 1000);
//   const codeHash = sha256(code);

//   await db.collection("otps").add({
//     uid,
//     codeHash,
//     expiresAt,
//     createdAt: FieldValue.serverTimestamp(),
//     used: false,
//     attempts: 0,
//   });

//   return { code, expiresAt };
// }

// export async function verifyOtp(uid: string, code: string) {
//   const codeHash = sha256(code);
//   const snap = await db.collection("otps")
//     .where("uid", "==", uid)
//     .where("used", "==", false)
//     .orderBy("createdAt", "desc")
//     .limit(5)
//     .get();

//   const now = new Date();

//   for (const doc of snap.docs) {
//     const data = doc.data() as any;
//     const ref = doc.ref;

//     // หมดอายุ
//     if (data.expiresAt?.toDate && data.expiresAt.toDate() < now) {
//       await ref.update({ used: true });
//       continue;
//     }

//     // ตรวจ hash
//     if (data.codeHash === codeHash) {
//       await ref.update({ used: true });
//       return true;
//     } else {
//       await ref.update({ attempts: (data.attempts || 0) + 1 });
//     }
//   }
//   return false;
// }


// src/utils/otp.ts
import crypto from "crypto";
import { db, FieldValue } from "../config/firebase";

function hash(val: string) {
  return crypto.createHash("sha256").update(val).digest("hex");
}

function randomCode(len = 6) {
  // 6 digits
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n).slice(0, len);
}

/** Create OTP for uid and store hashed code with TTL */
export async function createOtpForUser(uid: string) {
  const code = randomCode(6);
  const ttlMin = Number(process.env.OTP_TTL_MINUTES || 5);
  const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

  const ref = db.collection("otp").doc(uid);
  await ref.set(
    {
      codeHash: hash(code),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
      attempts: 0,
      used: false,
    },
    { merge: true }
  );

  return { code, expiresAt };
}

/** Verify OTP for uid */
export async function verifyOtp(uid: string, code: string) {
  const ref = db.collection("otp").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data() as any;
  if (data.used) return false;

  const now = Date.now();
  const exp = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : new Date(data.expiresAt).getTime();
  if (!exp || now > exp) {
    return false;
  }

  const match = data.codeHash === hash(code);
  const attempts = Number(data.attempts || 0) + 1;

  await ref.set({ attempts }, { merge: true });

  if (!match) return false;

  // consume
  await ref.set({ used: true, usedAt: FieldValue.serverTimestamp() }, { merge: true });
  return true;
}
