"""
Email utilities for OTP delivery.
Uses Django's built-in EmailMultiAlternatives for HTML + text emails.
"""

from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def send_otp_email(user, otp: str) -> bool:
    """
    Send a styled OTP verification email.

    Args:
        user: User instance
        otp:  Plain 6-digit OTP string

    Returns:
        True on success, False on failure.
    """
    subject    = "🔐 Your FutsalHub Verification Code"
    from_email = settings.DEFAULT_FROM_EMAIL
    to         = [user.email]

    # ── Plain text fallback ───────────────────────────────────────────────────
    text_content = (
        f"Hi {user.full_name},\n\n"
        f"Your FutsalHub verification code is:\n\n"
        f"  {otp}\n\n"
        f"This code expires in 5 minutes.\n"
        f"Do NOT share this code with anyone.\n\n"
        f"If you did not request this, ignore this email.\n\n"
        f"— The FutsalHub Team"
    )

    # ── HTML email ────────────────────────────────────────────────────────────
    # Each OTP digit rendered in its own box for clarity
    otp_boxes = "".join(
        f'<td style="width:48px;height:56px;background:#1a1a2e;border:2px solid #f59e0b;'
        f'border-radius:10px;text-align:center;vertical-align:middle;'
        f'font-size:28px;font-weight:900;color:#f59e0b;font-family:monospace;'
        f'letter-spacing:0;">{digit}</td>'
        f'<td style="width:8px;"></td>'
        for digit in otp
    )

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#111118;border:1px solid #1e1e2e;border-radius:20px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);
                       padding:32px 40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">⚽</div>
              <h1 style="margin:0;font-size:24px;color:#000;font-weight:900;
                         letter-spacing:-0.5px;">FutsalHub</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(0,0,0,0.6);">
                Email Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 8px;font-size:20px;color:#fff;font-weight:700;">
                Hi {user.full_name} 👋
              </h2>
              <p style="margin:0 0 28px;font-size:15px;color:#888;line-height:1.6;">
                Use the code below to verify your email address.
                This code is valid for <strong style="color:#f59e0b;">5 minutes</strong>.
              </p>

              <!-- OTP digits -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  {otp_boxes}
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #1e1e2e;margin:28px 0;"/>

              <!-- Warning -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background:#1a1206;border:1px solid #3d2b06;border-radius:10px;
                             padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#f59e0b;line-height:1.5;">
                      🔒 <strong>Never share this code</strong> with anyone.
                      FutsalHub staff will never ask for your OTP.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#444;line-height:1.5;">
                Didn't request this? You can safely ignore this email.
                Someone may have entered your email by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0c0c14;padding:20px 40px;text-align:center;
                       border-top:1px solid #1e1e2e;">
              <p style="margin:0;font-size:12px;color:#333;">
                © 2026 FutsalHub · Final Year Project
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    try:
        msg = EmailMultiAlternatives(subject, text_content, from_email, to)
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        return True
    except Exception as e:
        # Log but don't crash the request
        import logging
        logging.getLogger(__name__).error(f"OTP email failed for {user.email}: {e}")
        return False