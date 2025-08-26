// import { Request, Response, NextFunction } from "express";

// export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
//   console.error("[error]", err);
//   const status = err.status || 500;
//   res.status(status).json({
//     error: err.message || "Internal Server Error",
//   });
// }

// src/utils/error.ts
import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("[error]", err?.message, err?.stack || err);
  const status = err.status || 500;
  res.status(status).json({ error: err?.message || "Internal Server Error" });
}
