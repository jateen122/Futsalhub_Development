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
    subject    = "Your FutsalHub Verification Code"
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
  <title>FutsalHub - OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#f8f9f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9f5;padding:40px 0;">
    <tr>
      <td align="center">
        <!-- Full width container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #f0e6d2;border-radius:24px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;color:#000;font-weight:700;letter-spacing:-0.5px;">
                FutsalHub
              </h1>
              <p style="margin:8px 0 0;font-size:15px;color:rgba(0,0,0,0.75);font-weight:500;">
                Email Verification
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <h2 style="margin:0 0 12px;font-size:22px;color:#111827;font-weight:600;">
                Hi {user.full_name},
              </h2>
              <p style="margin:0 0 32px;font-size:16px;color:#4b5563;line-height:1.6;">
                Use the code below to verify your email address.<br>
                This code is valid for <strong style="color:#d97706;">5 minutes</strong>.
              </p>

              <!-- OTP Boxes -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  {otp_boxes}
                </tr>
              </table>

              <!-- Warning -->
              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#fffbeb;border:1px solid #fde68c;border-radius:16px;padding:16px 20px;">
                    <p style="margin:0;font-size:14px;color:#854d0e;line-height:1.5;">
                      <strong>Never share this code</strong> with anyone.<br>
                      FutsalHub staff will never ask for your OTP.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.5;">
                Didn't request this? You can safely ignore this email.
                Someone may have entered your email by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9f5;padding:24px 40px;text-align:center;border-top:1px solid #f0e6d2;">
              <p style="margin:0;font-size:13px;color:#6b7280;">
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