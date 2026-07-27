export function magicLinkEmailHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to Academic Planner</title>
</head>
<body style="margin:0;padding:0;background:#0f0f14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background:#0f0f14;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:#1a1a24;border-radius:16px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#a855f7);">
                <span style="font-size:20px;">🎓</span>
              </div>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding:20px 32px 8px 32px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#f0f0f5;">Sign in to Academic Planner</h1>
            </td>
          </tr>
          <!-- Subtitle -->
          <tr>
            <td style="padding:0 32px 24px 32px;text-align:center;">
              <p style="margin:0;font-size:14px;color:#8888a0;">Click the button below to securely sign in to your account.</p>
            </td>
          </tr>
          <!-- Button -->
          <tr>
            <td style="padding:0 32px 24px 32px;text-align:center;">
              <a href="${url}" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;background:#7c3aed;border-radius:10px;text-decoration:none;transition:opacity 0.2s;">Sign in</a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555570;line-height:1.5;">
                If you did not request this email, you can safely ignore it.<br>
                This link will expire in 24 hours.
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

export function magicLinkEmailText(url: string): string {
  return `Sign in to Academic Planner

Click the link below to sign in:

${url}

If you did not request this email, you can safely ignore it.
This link will expire in 24 hours.
`
}
