import { Resend } from "resend";

/**
 * Constructed on first send, not at import.
 *
 * `new Resend(undefined)` throws immediately. At module scope that turned a
 * missing RESEND_API_KEY into a build-time crash: Next imports this file
 * while collecting page data for /api/leads, so the entire build died —
 * because *email* was misconfigured. Deferring it keeps the failure
 * proportionate. The site builds and serves, and a missing key is reported
 * by deliver() as an ordinary send failure, in the same place every other
 * email problem already surfaces.
 */
let client: Resend | null = null;

function getResend(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  client = new Resend(key);
  return client;
}

const BUSINESS_EMAIL = process.env.BUSINESS_EMAIL ?? "hello@96kapital.com";
const FROM_EMAIL = process.env.RESEND_FROM
  ? `96 Kapital CRM <${process.env.RESEND_FROM}>`
  : 'onboarding@resend.dev';
const LOGO_URL = process.env.LOGO_URL ?? "";
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? "";

// ── Customer auto-reply ────────────────────────────────────────────────────
/**
 * Send via Resend and actually inspect the outcome.
 *
 * The Resend SDK (v6) RESOLVES with { data, error } when the API rejects a
 * send — it does not throw. Both senders here used to `return
 * resend.emails.send(...)` and discard that, and the caller wraps them in
 * Promise.allSettled, which counts a resolved-with-error as fulfilled. So an
 * invalid key, an unverified sender or a blocked recipient produced no error,
 * no log and no email. The KAPVOY site had the identical bug and it hid a
 * genuine outage for days: leads recorded fine while every notification
 * silently failed.
 */
async function deliver(
  label: string,
  payload: Parameters<Resend["emails"]["send"]>[0]
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.error(
      `[email] ${label} NOT SENT — RESEND_API_KEY is not set. No notification ` +
      `was delivered for this lead.`
    );
    return false;
  }
  try {
    const { data, error } = await resend.emails.send(payload);
    if (error) {
      console.error(
        `[email] ${label} rejected by Resend:`,
        JSON.stringify({ from: FROM_EMAIL, to: (payload as { to?: unknown }).to, error })
      );
      return false;
    }
    console.log(`[email] ${label} sent, id: ${data?.id}`);
    return true;
  } catch (err) {
    // Network/DNS level — distinct from an API rejection above.
    console.error(`[email] ${label} threw:`, err);
    return false;
  }
}

export async function sendCustomerEmail(data: {
  name: string;
  email: string;
  service: string;
  planDetails?: string;
  location?: string;
  estimatedCost: string;
  productImageUrl?: string;
}) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        ${LOGO_URL ? `
        <!-- Header logo -->
        <tr>
          <td style="background:#ffffff;padding:16px 16px 0;text-align:center;border-bottom:4px solid #2563eb;">
            <img src="${LOGO_URL}" alt="Logo" style="height:48px;width:auto;display:block;margin:0 auto 16px;" />
          </td>
        </tr>` : ""}

        <!-- Blue title band -->
        <tr>
          <td style="background:#2563eb;padding:12px 16px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.02em;">Your Enquiry Confirmation</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:20px 16px 0;">
            <h2 style="margin:0 0 8px;font-size:19px;color:#1e293b;">Dear ${data.name},</h2>
            <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
              Thank you for reaching out. We have received your enquiry and a member of our team will be in touch shortly.
            </p>
          </td>
        </tr>

        <!-- Estimate box -->
        <tr>
          <td style="padding:16px 16px;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:20px;text-align:center;">
              <p style="margin:0 0 4px;font-size:11px;color:#3b82f6;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Estimated Value</p>
              <p style="margin:0;font-size:32px;font-weight:800;color:#1d4ed8;">${data.estimatedCost}</p>
              <p style="margin:6px 0 0;font-size:12px;color:#64748b;font-style:italic;">Estimate only — final cost may vary</p>
            </div>
          </td>
        </tr>

        <!-- Summary table -->
        <tr>
          <td style="padding:0 16px 16px;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Your Enquiry Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
              ${[
                ["Service Interest", data.service],
                ...(data.planDetails ? [["Details", data.planDetails]] : []),
                ...(data.location ? [["Preferred Location", data.location]] : []),
              ].map(([label, value], i) => `
              <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
                <td style="padding:10px 14px;font-size:12px;color:#64748b;font-weight:600;width:40%;border-right:1px solid #e2e8f0;">${label}</td>
                <td style="padding:10px 14px;font-size:13px;color:#1e293b;">${value}</td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        ${data.productImageUrl ? `
        <!-- Product/service preview -->
        <tr>
          <td style="padding:0 16px 16px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Selected Service / Product</p>
            <div style="background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0;">
              <img src="${data.productImageUrl}" alt="Service preview" style="max-width:280px;width:100%;border-radius:8px;" />
            </div>
          </td>
        </tr>` : ""}

        <!-- Next steps -->
        <tr>
          <td style="padding:0 16px 16px;">
            <div style="background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 8px 8px 0;padding:16px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#15803d;">What happens next?</p>
              <p style="margin:0;font-size:13px;color:#166534;line-height:1.6;">
                Our team will reach out within <strong>5 minutes</strong>. Need help right now? Tap the button below.
              </p>
            </div>
          </td>
        </tr>

        ${WHATSAPP_NUMBER ? `
        <!-- WhatsApp CTA -->
        <tr>
          <td style="padding:0 16px 24px;text-align:center;">
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I just submitted an enquiry and would like some assistance.")}"
               style="display:inline-block;background:#16a34a;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:50px;letter-spacing:0.02em;">
              💬 WhatsApp Us Now
            </a>
            <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Available 24/7</p>
          </td>
        </tr>` : ""}

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:14px 16px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0 0 3px;font-size:12px;color:#94a3b8;font-weight:600;">96 Kapital CRM</p>
            <p style="margin:0;font-size:11px;color:#cbd5e1;">&copy; ${new Date().getFullYear()} 96 Kapital CRM. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Dear ${data.name},

Thank you for reaching out. We have received your enquiry and a member of our team will be in touch shortly.

Estimated Value: ${data.estimatedCost}

Enquiry Details:
- Service Interest: ${data.service}${data.planDetails ? `\n- Details: ${data.planDetails}` : ""}${data.location ? `\n- Preferred Location: ${data.location}` : ""}

Our team will reach out within 5 minutes.${WHATSAPP_NUMBER ? ` Need help now? WhatsApp us at +${WHATSAPP_NUMBER}.` : ""}

96 Kapital CRM`;

  return deliver("customer confirmation", {
    from: FROM_EMAIL,
    to: data.email,
    replyTo: BUSINESS_EMAIL,
    subject: `Your Enquiry Confirmation — 96 Kapital CRM`,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `96k-customer-${Date.now()}`,
    },
  });
}

// ── Business owner lead notification ──────────────────────────────────────
export async function sendBusinessLeadEmail(data: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  service: string;
  planDetails?: string;
  location?: string;
  notes?: string;
  estimatedCost: string;
  productImageUrl?: string;
}) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155;">

        ${LOGO_URL ? `
        <!-- Header logo -->
        <tr>
          <td style="background:#ffffff;padding:16px 16px;text-align:center;border-bottom:none;">
            <img src="${LOGO_URL}" alt="Logo" style="height:44px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>` : ""}

        <!-- Green confirmation bar -->
        <tr>
          <td style="background:#15803d;padding:10px 16px;text-align:center;">
            <p style="margin:0;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.02em;">✅ New Lead Received — Action Required</p>
          </td>
        </tr>

        <!-- Estimated value highlight -->
        <tr>
          <td style="padding:14px 16px 0;">
            <div style="background:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.4);border-radius:10px;padding:14px;text-align:center;">
              <p style="margin:0 0 2px;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Estimated Value</p>
              <p style="margin:0;font-size:28px;font-weight:800;color:#60a5fa;">${data.estimatedCost}</p>
            </div>
          </td>
        </tr>

        <!-- Contact info -->
        <tr>
          <td style="padding:12px 16px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Contact Information</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #334155;">
              ${[
                ["Name", data.name],
                ["Phone", `<a href="tel:${data.phone}" style="color:#60a5fa;text-decoration:none;">${data.phone}</a>`],
                ["Email", `<a href="mailto:${data.email}" style="color:#60a5fa;text-decoration:none;">${data.email}</a>`],
                ...(data.address ? [["Address", data.address]] : []),
              ].map(([label, value], i) => `
              <tr style="background:${i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"};">
                <td style="padding:10px 14px;font-size:12px;color:#94a3b8;font-weight:600;width:35%;border-right:1px solid #334155;">${label}</td>
                <td style="padding:10px 14px;font-size:13px;color:#e2e8f0;">${value}</td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        <!-- Service details -->
        <tr>
          <td style="padding:12px 16px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Service Details</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #334155;">
              ${[
                ["Service Interest", data.service],
                ...(data.planDetails ? [["Details", data.planDetails]] : []),
                ...(data.location ? [["Preferred Location", data.location]] : []),
              ].map(([label, value], i) => `
              <tr style="background:${i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"};">
                <td style="padding:10px 14px;font-size:12px;color:#94a3b8;font-weight:600;width:35%;border-right:1px solid #334155;">${label}</td>
                <td style="padding:10px 14px;font-size:13px;color:#e2e8f0;">${value}</td>
              </tr>`).join("")}
            </table>
          </td>
        </tr>

        ${data.notes ? `
        <!-- Additional notes -->
        <tr>
          <td style="padding:12px 16px 0;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Additional Notes</p>
            <div style="background:rgba(255,255,255,0.03);border:1px solid #334155;border-radius:8px;padding:12px 14px;">
              <p style="margin:0;font-size:13px;color:#e2e8f0;line-height:1.6;">${data.notes}</p>
            </div>
          </td>
        </tr>` : ""}

        ${data.productImageUrl ? `
        <!-- Product/service image -->
        <tr>
          <td style="padding:12px 16px 0;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Selected Service / Product</p>
            <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px;border:1px solid #334155;">
              <img src="${data.productImageUrl}" alt="Service preview" style="max-width:240px;width:100%;border-radius:8px;" />
            </div>
          </td>
        </tr>` : ""}

        <!-- Spacer -->
        <tr><td style="padding:20px;"></td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:12px 16px;text-align:center;border-top:1px solid #334155;">
            <p style="margin:0;font-size:11px;color:#475569;">&copy; ${new Date().getFullYear()} 96 Kapital CRM CRM</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `NEW LEAD RECEIVED — ACTION REQUIRED

Estimated Value: ${data.estimatedCost}

Contact:
  Name: ${data.name}
  Email: ${data.email}
  Phone: ${data.phone}${data.address ? `\n  Address: ${data.address}` : ""}

Service Details:
  Service Interest: ${data.service}${data.planDetails ? `\n  Details: ${data.planDetails}` : ""}${data.location ? `\n  Preferred Location: ${data.location}` : ""}${data.notes ? `\n\nNotes: ${data.notes}` : ""}

-- 96 Kapital CRM CRM`;

  return deliver("business lead alert", {
    from: FROM_EMAIL,
    to: BUSINESS_EMAIL,
    subject: `New Lead: ${data.name} — ${data.service} (${data.estimatedCost})`,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `96k-lead-${Date.now()}`,
    },
  });
}
