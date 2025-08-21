// import admin from "firebase-admin";
// import { env } from "../envv";

// admin.initializeApp({
//   credential: admin.credential.cert({
//     projectId: env.FIREBASE_PROJECT_ID,
//     clientEmail: env.FIREBASE_CLIENT_EMAIL,
//     privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
//   }),
//   storageBucket: env.FIREBASE_STORAGE_BUCKET
// });

// export const db = admin.firestore();
// export const bucket = admin.storage().bucket();
// export const auth = admin.auth();
// export const FieldValue = admin.firestore.FieldValue;

import admin from "firebase-admin";
import { env } from "./envv";

if (admin.apps.length === 0) {
  const creds: admin.ServiceAccount = {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.credential.cert(creds),
    ...(env.FIREBASE_STORAGE_BUCKET
      ? { storageBucket: env.FIREBASE_STORAGE_BUCKET }
      : {}),
  });

  console.log("✅ Firebase Admin initialized");
}

export const db = admin.firestore();
export const auth = admin.auth();
export const bucket = admin.storage().bucket();
export const FieldValue = admin.firestore.FieldValue;
