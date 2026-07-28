export function otpEmailHtml(otp: string): string {
  const spaced = otp.split('').join('&nbsp;&nbsp;')
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your sign-in code for Academic Planner</title>
</head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0f0f14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:#1a1a24;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);">
                <span style="font-size:20px;">🎓</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 8px 32px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#f0f0f5;">Your sign-in code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#8888a0;">Enter this code to sign in to Academic Planner.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px 32px;text-align:center;">
              <div style="display:inline-block;padding:16px 32px;background:#0f0f14;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
                <span style="font-size:36px;font-weight:700;color:#a78bfa;letter-spacing:12px;font-variant-numeric:tabular-nums;">${spaced}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555570;line-height:1.5;">
                This code expires in 5 minutes.<br>
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function otpEmailText(otp: string): string {
  const spaced = otp.split('').join(' ')
  return `Academic Planner — Your sign-in code

Enter this code to sign in to your account:

  ${spaced}

This code expires in 5 minutes.
If you did not request this email, you can safely ignore it.
`
}
