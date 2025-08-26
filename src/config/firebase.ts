// import admin from "firebase-admin";
// import { env } from "./envv";

// if (admin.apps.length === 0) {
//   const creds: admin.ServiceAccount = {
//     projectId: env.FIREBASE_PROJECT_ID,
//     clientEmail: env.FIREBASE_CLIENT_EMAIL,
//     privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
//   };

//   admin.initializeApp({
//     credential: admin.credential.cert(creds),
//     ...(env.FIREBASE_STORAGE_BUCKET
//       ? { storageBucket: env.FIREBASE_STORAGE_BUCKET }
//       : {}),
//   });

//   console.log("✅ Firebase Admin initialized");
// }

// export const db = admin.firestore();
// export const auth = admin.auth();
// export const bucket = admin.storage().bucket();
// export const FieldValue = admin.firestore.FieldValue;

// src/config/firebase.ts
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// guard + fix newline
if (!projectId) throw new Error("ENV FIREBASE_PROJECT_ID is missing");
if (!clientEmail) throw new Error("ENV FIREBASE_CLIENT_EMAIL is missing");
if (!privateKey) throw new Error("ENV FIREBASE_PRIVATE_KEY is missing");

// Render/Vercel เก็บเป็น single-line -> ต้อง replace
privateKey = privateKey.replace(/\\n/g, "\n");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    // (ถ้าใช้ Storage)
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
export const bucket = admin.storage?.().bucket?.();
