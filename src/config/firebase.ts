// src/config/firebase.ts
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// const projectId = "website-soullinkai-563d7";
// const clientEmail = "firebase-adminsdk-fbsvc@website-soullinkai-563d7.iam.gserviceaccount.com";
// let privateKey = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDmZ2mAIKu9TnYH\nnGHAiouoyLYzXm1sYdwVqigJLASQUPaeLdwX54YuVL8mXikZs47k3IfP3/zVIaIx\n8J4bidYrRSqMqEnXfkNuC1uIK4x08tbkpf0V3aBGdRY6Y7KCVar41s18cEpQQu2h\nRNGdQaUH8BvpmJBZt33Ha/K4HgodL8+gVzWQ8AQUlnBSHW83jXgMpWzT7JDBKDsT\nZFjIotQSmnVqEQ+2Hbn+fAOMZ5cOOe0fmgyC0n7Ypca44f3FQn9YRWZAoHHweZ7W\nRaOrwWlVxAQLu7US7wzMsHkLSR0scUn+r3K9hQZF9XFAjx+ZkrZ0+VmTBJwLx97I\nbzqYO3vRAgMBAAECgf82YsTyMHrrxuKnxK/gnopY31D+PN4ptzjzCMmPF4uzF2lo\nf2q9p3tOBrMYNtihXQo5RLCBF/BxzH6hSyriectdRtHEYfUMMgrdOBo+eAkdSMdw\n6E/VRzIgSvDPswICVDZ1GNFoaatqIhkaHLbLsSDVvtezTCtZAhuuiV7mYDDeaUEt\nobTUAQ4xkA/pV7t0am+YXPNGKoLXHpWQ6TK2V2A2nSTVtEtdUEuid8eGcqPxMHR6\nKfibfvAE3pCqc5LQwVYclq0rgJEBQOvaO12cn8yBgMZdZxcLWGe9/7SWIU9Q5PgU\nOuitohVLMQZbp+MEHfavDNRkv+Do1eAW6hGqi0ECgYEA+ihz4NNzbnzmKM9WH2GP\n76fyYAui0LE2CPNdGFXNTaitTDcwy3bNCOjFZxOOeBkIqdXdly2lO/XFigco4sYD\nFv4KKjXEuLduNRIDjUDPxFFNbDLT3bnrbhuoZp7zdJbYTUL4fWjIABzoqWNq1Qmx\n/NJVjl302S3W5BJzOCSQRlkCgYEA68jcjrUHqyW2dVAKybvx5FZrvwnDGGUHZRV1\nL+OJgG7PzvBXjJR+T93TuPIi2/GtdlPSxF9Ncu/MNjC+v7D+nPaw75mIt64Bb/l4\n14ikQTagX4SivKQHxHLMroGbsjF6uuD/ojOTq7CpY35Eikmohwl3QShRyScr/XMX\nyFBkIjkCgYEA8e2va65zw1YNbUhffQfooRjmgdafBn9rx6o8zW0lmUZZGw2BJjTl\nxAkB6Fb0gNeNFlsb67ocQ+nDumKEOxTPJixXfkzzzMSxU6fxQWl9xdnvK4XYemX0\n907ORTjSMF42IDp1gSuVyO4sYK0iQ5gVx3FPhtj9FBCN85KYVaKe2TkCgYAMc6Ya\nLztBcZNqLJj1QGSs31d/Vj+kWSmD0BdJOSX4z2FQF2c4OFtXUmqs+LSYkvHLLvAR\niMrpR/qr3fUk4G8B0RFVBfGvaZQP2sfj8gZin0Tm5nVFqw/x8vIWQSf8yBooJlu5\nsCmbRpAbff6Wov8wanKO0VdIXTY4g0x9OqmfGQKBgQC5XYosiVk8cqXcfZTp+m3d\nmkI+832ekukmDrtITuwntYRU11bRpuLZf2QMt9IwU/UfAyO6ufTQ29/GaOzAF5iR\nN7OTcqwkctJ7ZY49BIGIreMrA4BClOm1hoxQ8V1Fhut9JU8kJ2UiaKbxWI5r9uTr\nBC5rVco4xnJsDrYKebIG+A==\n-----END PRIVATE KEY-----\n";

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
    // storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    storageBucket: "website-soullinkai-563d7.firebasestorage.app",
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
export const bucket = admin.storage().bucket?.();
