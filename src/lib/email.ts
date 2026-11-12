// Transactional email via Resend's HTTP API (no SDK needed). Needs two env
// vars: RESEND_API_KEY and EMAIL_FROM (e.g. "SportSync <no-reply@yourdomain.com>").
// Without them nothing is sent: in development the message is printed to the
// server console so flows can still be tested; in production it's a no-op.

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<boolean> {
  const { to, subject, text, ctaLabel, ctaUrl } = opts;

  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email:dev] to=${to}\nsubject=${subject}\n${text}\n${ctaUrl ?? ""}\n`);
    }
    return false;
  }

  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#171717">
<h2 style="margin:0 0 16px">Sport<span style="color:#15803d">Sync</span></h2>
<p style="line-height:1.5">${escapeHtml(text).replace(/\n/g, "<br>")}</p>
${
  ctaUrl && ctaLabel
    ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="background:#15803d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(ctaLabel)}</a></p>
<p style="font-size:12px;color:#737373">If the button doesn't work, paste this link into your browser:<br>${escapeHtml(ctaUrl)}</p>`
    : ""
}
<p style="font-size:12px;color:#737373;margin-top:32px">If you didn't expect this email, you can safely ignore it.</p>
</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text: ctaUrl ? `${text}\n\n${ctaUrl}` : text,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
