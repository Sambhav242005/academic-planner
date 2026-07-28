import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { otpEmailHtml, otpEmailText } from './email-template'

export function generateOtp(): string {
  return String(randomInt(100000, 999999))
}

export function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(otp, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyOtp(otp: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const hash = scryptSync(otp, salt, 64).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(key))
  } catch {
    return false
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Academic Planner <noreply@sambhav-surana.online>',
      to: email,
      subject: `Your code: ${otp}`,
      html: otpEmailHtml(otp),
      text: otpEmailText(otp),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend email error: ${res.status} ${body}`)
  }
}
