import { Router } from "express";
import { db, FieldValue } from "../config/firebase";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { message, metadata } = req.body;
    const data = {
      message,
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection("feedback").add(data);
    res.json({ id: ref.id, ...data });
  } catch (err) {
    next(err);
  }
});

export default router;
