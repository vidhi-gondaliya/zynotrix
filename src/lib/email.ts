import { Resend } from "resend";

// Lazily initialize so missing env vars don't crash module load at build time.
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = () => process.env.RESEND_FROM ?? "Colliq <onboarding@resend.dev>";
const REPLY_TO = () => process.env.RESEND_REPLY_TO;
const BASE_URL = () => process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://colliq.app";

function baseEmail(fields: Parameters<Resend["emails"]["send"]>[0]) {
  const replyTo = REPLY_TO();
  return getResend().emails.send({ ...(replyTo ? { replyTo } : {}), ...fields });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${BASE_URL()}/reset-password/${token}`;
  await baseEmail({
    from: FROM(),
    to: email,
    subject: "Reset your Colliq password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="font-size:18px;font-weight:900;letter-spacing:-0.04em;color:#0a0a14">COLLIQ</span>
          <span style="display:block;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;margin-top:2px">by Zynotrix</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0a0a14;margin:0 0 8px">Reset your password</h1>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6">
          We received a request to reset the password for your Colliq account.
          Click the button below — this link expires in <strong>1 hour</strong>.
        </p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">
          Reset Password
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.6">
          If you didn't request this, you can safely ignore this email. Your password won't change.<br>
          Or copy this link: <a href="${link}" style="color:#7c3aed">${link}</a>
        </p>
      </div>
    `,
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  orgName: string,
  inviterName: string
) {
  const link = `${BASE_URL()}/register?invite=${token}`;
  await baseEmail({
    from: FROM(),
    to: email,
    subject: `${inviterName} invited you to join ${orgName} on Colliq`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="font-size:18px;font-weight:900;letter-spacing:-0.04em;color:#0a0a14">COLLIQ</span>
          <span style="display:block;font-size:10px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;margin-top:2px">by Zynotrix</span>
        </div>
        <h1 style="font-size:22px;font-weight:800;color:#0a0a14;margin:0 0 8px">You're invited!</h1>
        <p style="font-size:14px;color:#6b7280;margin:0 0 24px;line-height:1.6">
          <strong style="color:#0a0a14">${inviterName}</strong> has invited you to join
          <strong style="color:#0a0a14">${orgName}</strong> on Colliq — the AI-powered work OS.
        </p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">
          Accept Invitation
        </a>
        <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;line-height:1.6">
          This invitation expires in 7 days. If you didn't expect this, ignore this email.<br>
          Or copy this link: <a href="${link}" style="color:#7c3aed">${link}</a>
        </p>
      </div>
    `,
  });
}

export async function sendTaskAssignedEmail(
  email: string,
  taskTitle: string,
  projectName: string,
  assignerName: string,
  taskId: string
) {
  const link = `${BASE_URL()}/tasks`;
  await baseEmail({
    from: FROM(),
    to: email,
    subject: `New task assigned: ${taskTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="margin-bottom:24px">
          <span style="font-size:18px;font-weight:900;letter-spacing:-0.04em;color:#0a0a14">COLLIQ</span>
        </div>
        <h1 style="font-size:20px;font-weight:800;color:#0a0a14;margin:0 0 8px">Task assigned to you</h1>
        <p style="font-size:14px;color:#6b7280;margin:0 0 16px;line-height:1.6">
          <strong style="color:#0a0a14">${assignerName}</strong> assigned you a task in
          <strong style="color:#0a0a14">${projectName}</strong>:
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px">
          <p style="font-size:15px;font-weight:700;color:#0a0a14;margin:0">${taskTitle}</p>
        </div>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">
          View Task
        </a>
      </div>
    `,
  });
}
