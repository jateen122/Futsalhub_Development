from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def send_verification_email(user, token):
    """
    Send an HTML verification email to the newly registered user.

    Args:
        user  : User instance
        token : EmailVerificationToken instance
    """
    verification_url = (
        f"{settings.FRONTEND_URL}/verify-email/{token.token}"
    )

    subject = "✅ Verify your FutsalHub account"
    from_email = settings.DEFAULT_FROM_EMAIL
    to = [user.email]

    # ── Plain-text fallback ───────────────────────────────────────────────────
    text_content = (
        f"Hi {user.full_name},\n\n"
        f"Thanks for registering on FutsalHub!\n\n"
        f"Please verify your email by clicking the link below:\n"
        f"{verification_url}\n\n"
        f"This link is valid for 24 hours.\n\n"
        f"— The FutsalHub Team"
    )

    # ── HTML email body ───────────────────────────────────────────────────────
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your FutsalHub account</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f0f;font-family:Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;color:#000000;letter-spacing:1px;">⚽ FutsalHub</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#1a1a1a;opacity:0.8;">Book your futsal ground instantly</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:22px;color:#f59e0b;">
                Hi {user.full_name} 👋
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#cccccc;">
                Thanks for creating your <strong style="color:#ffffff;">FutsalHub</strong> account!
                One last step — please verify your email address to activate your account.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:32px auto;">
                <tr>
                  <td style="background:#f59e0b;border-radius:10px;text-align:center;">
                    <a href="{verification_url}"
                       style="display:inline-block;padding:16px 40px;font-size:16px;font-weight:bold;
                              color:#000000;text-decoration:none;letter-spacing:0.5px;">
                      ✅ Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#888888;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
                <a href="{verification_url}" style="color:#f59e0b;">{verification_url}</a>
              </p>

              <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0;"/>

              <p style="margin:0;font-size:13px;color:#666666;line-height:1.6;">
                ⏳ This link expires in <strong style="color:#aaaaaa;">24 hours</strong>.<br/>
                If you did not create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#111111;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555555;">
                © 2026 FutsalHub. All rights reserved.
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

    msg = EmailMultiAlternatives(subject, text_content, from_email, to)
    msg.attach_alternative(html_content, "text/html")
    msg.send()
