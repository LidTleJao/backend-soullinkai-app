// src/utils/mailer.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER!;
  const info = await transporter.sendMail({ from, to, subject, html });
  return info;
}

export async function sendOtpEmail(to: string, code: string) {
  const ttl = Number(process.env.OTP_TTL_MINUTES || 5);
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif">
      <h2>Everlink AI — Your OTP</h2>
      <p>Use this one-time code to continue:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0;">${code}</div>
      <p>This code expires in <b>${ttl} minutes</b>.</p>
      <p>If this wasn't you, ignore this email.</p>
    </div>
  `;
  return sendMail(to, "Your OTP Code", html);
}
