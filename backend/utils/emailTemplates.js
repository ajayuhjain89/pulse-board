/**
 * Centralized, email-safe templates for Pulse Board's transactional auth mail.
 *
 * Pulse Board's auth is OTP-code based (no reset *links*): the same one-time
 * code verifies a new email or authorizes a password reset, depending on
 * `purpose`. These helpers render BOTH a branded HTML part and a plain-text
 * fallback (multipart/alternative) so the message degrades gracefully and
 * scores better with spam filters.
 *
 * Email-client constraints honored here:
 *   - table-based layout + inline styles (no external/`<style>`-only CSS)
 *   - a fluid max-width container → responsive without media queries
 *   - no images at all (no broken images, fewer spam triggers; text wordmark)
 *   - hardcoded hex colors (CSS variables/web fonts don't load in mail clients)
 *   - light card + dark text that stays readable under client dark-mode
 *
 * Keep content edits inside PURPOSES; layout/button/code helpers are shared.
 */

// Pulse Board brand palette (mirrors the app's design tokens, hardcoded because
// email clients strip CSS custom properties).
const COLOR = {
  page: "#f0ede8", // neutral paper background
  card: "#ffffff",
  ink: "#0f0f0f",
  ink2: "#3d3d3d",
  ink3: "#6f6f6f",
  hairline: "#e2deda",
  accent: "#c17a3a", // warm ochre
  codeBg: "#f7f5f2",
};

// Serif display stack (Instrument Serif won't load in mail → Georgia fallback);
// sans body stack mirrors DM Sans with safe system fallbacks.
const FONT_DISPLAY = "Georgia, 'Times New Roman', serif";
const FONT_BODY =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );

// Per-purpose copy. Everything user-facing that differs between an email
// verification and a password reset lives here so the layout stays generic.
const PURPOSES = {
  verify: {
    subject: "Verify your Pulse Board email",
    preheader: "Your verification code is inside — it expires in {ttl} minutes.",
    heading: "Confirm your email",
    intro:
      "Welcome to Pulse Board. Enter the code below to verify your email and finish setting up your account.",
    codeLabel: "Verification code",
    ctaLabel: "Open Pulse Board",
    ctaPath: "/register",
    ignoreNote:
      "If you didn't create a Pulse Board account, you can safely ignore this email.",
    footerReason:
      "You're receiving this because this email was used to create a Pulse Board account.",
  },
  reset: {
    subject: "Your Pulse Board password reset code",
    preheader: "Use this code to reset your password — it expires in {ttl} minutes.",
    heading: "Reset your password",
    intro:
      "We received a request to reset the password for your Pulse Board account. Enter the code below to choose a new password.",
    codeLabel: "Password reset code",
    ctaLabel: "Reset password",
    ctaPath: "/forgot-password",
    ignoreNote:
      "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
    footerReason:
      "You're receiving this because a password reset was requested for this email on Pulse Board.",
  },
};

// A solid, table-cell CTA button — renders reliably across Gmail/Apple/mobile.
const button = ({ href, label }) => `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
          <tr>
            <td align="center" bgcolor="${COLOR.accent}" style="border-radius:8px;">
              <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;padding:13px 28px;font-family:${FONT_BODY};font-size:15px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:8px;">
                ${escapeHtml(label)}
              </a>
            </td>
          </tr>
        </table>`;

const codeBlock = ({ label, otp }) => `
        <p style="margin:0 0 8px;font-family:${FONT_BODY};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.ink3};">
          ${escapeHtml(label)}
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" bgcolor="${COLOR.codeBg}" style="padding:18px 12px;border:1px solid ${COLOR.hairline};border-radius:10px;">
              <span style="font-family:${FONT_MONO};font-size:34px;font-weight:700;letter-spacing:10px;color:${COLOR.ink};">
                ${escapeHtml(otp)}
              </span>
            </td>
          </tr>
        </table>`;

const layout = ({ title, preheader, bodyHtml }) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background-color:${COLOR.card};border:1px solid ${COLOR.hairline};border-radius:14px;">
          <tr>
            <td style="padding:28px 32px 0;">
              <span style="font-family:${FONT_DISPLAY};font-size:21px;font-weight:400;color:${COLOR.ink};letter-spacing:-0.01em;">
                <span style="color:${COLOR.accent};">&#9679;</span>&nbsp;Pulse Board
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
          <tr>
            <td style="padding:20px 32px 0;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${COLOR.ink3};">
              Pulse Board &middot; Real-time polls &amp; live results
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Render a branded transactional auth email for a one-time code.
 * @param {object} opts
 * @param {"verify"|"reset"} opts.purpose
 * @param {string} opts.otp        the 6-digit code
 * @param {number} [opts.ttlMinutes=10]  code lifetime, for the expiry copy
 * @param {string} opts.appUrl     frontend base URL for the CTA + fallback link
 * @returns {{ subject: string, text: string, html: string }}
 */
export const renderAuthCodeEmail = ({
  purpose = "verify",
  otp,
  ttlMinutes = 10,
  appUrl,
}) => {
  const cfg = PURPOSES[purpose] || PURPOSES.verify;
  const base = String(appUrl || "").replace(/\/+$/, "");
  const ctaHref = `${base}${cfg.ctaPath}`;
  const preheader = cfg.preheader.replace("{ttl}", ttlMinutes);

  const securityNote = `This code expires in ${ttlMinutes} minutes and can be used once. ${cfg.ignoreNote} For your security, never share this code — Pulse Board will never ask you for it.`;

  const bodyHtml = `
        <h1 style="margin:0 0 12px;font-family:${FONT_DISPLAY};font-size:26px;font-weight:400;line-height:1.2;color:${COLOR.ink};">
          ${escapeHtml(cfg.heading)}
        </h1>
        <p style="margin:0 0 24px;font-family:${FONT_BODY};font-size:15px;line-height:1.65;color:${COLOR.ink2};">
          ${escapeHtml(cfg.intro)}
        </p>
        ${codeBlock({ label: cfg.codeLabel, otp })}
        <div style="height:24px;line-height:24px;">&nbsp;</div>
        ${button({ href: ctaHref, label: cfg.ctaLabel })}
        <p style="margin:12px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${COLOR.ink3};">
          Button not working? Open this link:<br />
          <a href="${escapeHtml(ctaHref)}" target="_blank" rel="noopener noreferrer" style="color:${COLOR.accent};text-decoration:underline;word-break:break-all;">${escapeHtml(ctaHref)}</a>
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
          <tr><td style="border-top:1px solid ${COLOR.hairline};font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <p style="margin:20px 0 0;font-family:${FONT_BODY};font-size:13px;line-height:1.65;color:${COLOR.ink3};">
          ${escapeHtml(securityNote)}
        </p>
        <p style="margin:14px 0 0;font-family:${FONT_BODY};font-size:12px;line-height:1.6;color:${COLOR.ink3};">
          ${escapeHtml(cfg.footerReason)}
        </p>`;

  // Plain-text fallback — preserves deliverability and readability when HTML
  // is stripped. Mirrors the HTML content (code, expiry, link, security note).
  const text = [
    cfg.heading,
    "",
    cfg.intro,
    "",
    `${cfg.codeLabel}: ${otp}`,
    "",
    `${cfg.ctaLabel}: ${ctaHref}`,
    "",
    securityNote,
    "",
    cfg.footerReason,
    "",
    "Pulse Board — Real-time polls & live results",
  ].join("\n");

  return {
    subject: cfg.subject,
    text,
    html: layout({ title: cfg.subject, preheader, bodyHtml }),
  };
};
