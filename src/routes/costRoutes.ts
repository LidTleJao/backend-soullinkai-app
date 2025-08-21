// import { Router } from "express";

// const router = Router();

// /**
//  * Input (ตัวอย่าง):
//  * {
//  *   "monthlyActiveUsers": 5000,
//  *   "avgChatsPerUser": 20,
//  *   "tokensPerChat": 800,         // หรือ "chars" แล้วแต่หน่วยของโมเดลคุณ
//  *   "modelCostPer1kTokens": 0.0005, // $ ต่อ 1k tokens (ใส่ของ Grok plan)
//  *   "storageGB": 20,
//  *   "storageCostPerGB": 0.026,    // $/GB Firebase Storage (region ขึ้นกับโปรเจกต์)
//  *   "firestoreReads": 200000,
//  *   "firestoreWrites": 100000,
//  *   "firestoreDeletes": 10000,
//  *   "readCostPer100k": 0.06,
//  *   "writeCostPer100k": 0.18,
//  *   "deleteCostPer100k": 0.02,
//  *   "egressGB": 10,
//  *   "egressCostPerGB": 0.12,
//  *   "safetyBufferPct": 20         // บวก buffer เผื่อ peak
//  * }
//  */
// router.post("/estimate", (req, res) => {
//   const {
//     monthlyActiveUsers = 0,
//     avgChatsPerUser = 0,
//     tokensPerChat = 0,
//     modelCostPer1kTokens = 0,

//     storageGB = 0,
//     storageCostPerGB = 0.026,

//     firestoreReads = 0,
//     firestoreWrites = 0,
//     firestoreDeletes = 0,
//     readCostPer100k = 0.06,
//     writeCostPer100k = 0.18,
//     deleteCostPer100k = 0.02,

//     egressGB = 0,
//     egressCostPerGB = 0.12,

//     safetyBufferPct = 20,
//   } = req.body || {};

//   // ค่าโมเดล (xAI/Grok) ตาม tokens
//   const totalChats = monthlyActiveUsers * avgChatsPerUser;
//   const totalTokens = totalChats * tokensPerChat;
//   const modelCost = (totalTokens / 1000) * modelCostPer1kTokens;

//   // Storage
//   const storageCost = storageGB * storageCostPerGB;

//   // Firestore
//   const readsCost = (firestoreReads / 100000) * readCostPer100k;
//   const writesCost = (firestoreWrites / 100000) * writeCostPer100k;
//   const deletesCost = (firestoreDeletes / 100000) * deleteCostPer100k;

//   // Egress/Network
//   const egressCost = egressGB * egressCostPerGB;

//   const subtotal = modelCost + storageCost + readsCost + writesCost + deletesCost + egressCost;
//   const buffer = (subtotal * safetyBufferPct) / 100;
//   const total = subtotal + buffer;

//   res.json({
//     inputs: req.body,
//     breakdown: {
//       modelCost,
//       storageCost,
//       firestore: {
//         readsCost,
//         writesCost,
//         deletesCost,
//       },
//       egressCost,
//       subtotal,
//       buffer,
//     },
//     totalMonthlyUSD: total,
//   });
// });

// export default router;


import { Router } from "express";
import { env } from "../config/envv";

const router = Router();

router.post("/estimate", (req, res) => {
  const {
    monthlyActiveUsers = 0,
    avgChatsPerUser = 0,
    tokensPerChat = 0,
    modelCostPer1kTokens = env.DEFAULT_MODEL_COST_PER_1K_TOKENS,

    storageGB = 0,
    storageCostPerGB = env.DEFAULT_STORAGE_COST_PER_GB,

    firestoreReads = 0,
    firestoreWrites = 0,
    firestoreDeletes = 0,
    readCostPer100k = env.DEFAULT_READ_COST_PER_100K,
    writeCostPer100k = env.DEFAULT_WRITE_COST_PER_100K,
    deleteCostPer100k = env.DEFAULT_DELETE_COST_PER_100K,

    egressGB = 0,
    egressCostPerGB = env.DEFAULT_EGRESS_COST_PER_GB,

    safetyBufferPct = 20,
  } = req.body || {};

  const totalChats = monthlyActiveUsers * avgChatsPerUser;
  const totalTokens = totalChats * tokensPerChat;
  const modelCost = (totalTokens / 1000) * modelCostPer1kTokens;

  const storageCost = storageGB * storageCostPerGB;

  const readsCost = (firestoreReads / 100000) * readCostPer100k;
  const writesCost = (firestoreWrites / 100000) * writeCostPer100k;
  const deletesCost = (firestoreDeletes / 100000) * deleteCostPer100k;

  const egressCost = egressGB * egressCostPerGB;

  const subtotal = modelCost + storageCost + readsCost + writesCost + deletesCost + egressCost;
  const buffer = (subtotal * safetyBufferPct) / 100;
  const total = subtotal + buffer;

  res.json({
    inputs: req.body,
    breakdown: { modelCost, storageCost, firestore: { readsCost, writesCost, deletesCost }, egressCost, subtotal, buffer },
    totalMonthlyUSD: total,
  });
});

export default router;
