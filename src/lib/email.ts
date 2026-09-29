import nodemailer from 'nodemailer'

/**
 * Outgoing email via SMTP (e.g. Gmail with an App Password).
 * Required env: EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD.
 * Optional: EMAIL_FROM (defaults to EMAIL_SERVER_USER).
 */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
  )
}

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }) {
  if (!isEmailConfigured()) throw new Error('Email is not configured (EMAIL_SERVER_* env vars)')
  const port = Number(process.env.EMAIL_SERVER_PORT) || 587
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD },
  })
  const from = process.env.EMAIL_FROM || `Kojo Financial OS <${process.env.EMAIL_SERVER_USER}>`
  await transporter.sendMail({ from, ...opts })
}
