"""
Email service — fire-and-forget notifications via SMTP.
All functions are async-safe (blocking I/O runs in a thread).
Email is silently skipped when SMTP_HOST is not configured.
"""

import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings


def _sync_send(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as srv:
        if settings.SMTP_TLS:
            srv.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            srv.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        srv.send_message(msg)


async def send_email(to: str, subject: str, html: str) -> None:
    if not settings.SMTP_HOST:
        return
    try:
        await asyncio.to_thread(_sync_send, to, subject, html)
    except Exception as exc:
        # Never let email failures crash the request
        print(f"[email] Failed to send to {to}: {exc}")


async def send_result_email(
    student_email: str,
    student_name: str,
    exam_title: str,
    score: float,
) -> None:
    passed = score >= 60
    badge_color = "#059669" if passed else "#dc2626"
    badge_text  = "PASSED" if passed else "NOT PASSED"
    score_color = "#059669" if score >= 80 else "#d97706" if score >= 50 else "#dc2626"

    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:system-ui,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;
              border:1px solid #e0e7ff;box-shadow:0 4px 24px rgba(30,64,175,0.08);">
    <div style="background:#0a1628;padding:24px 32px;">
      <p style="margin:0;color:#818cf8;font-size:11px;font-family:monospace;letter-spacing:0.15em;
               text-transform:uppercase;">QuizMaster</p>
      <h1 style="margin:8px 0 0;color:white;font-size:20px;">Your Results Are Ready</h1>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 20px;color:#475569;font-size:14px;">Hi {student_name},</p>
      <p style="margin:0 0 24px;color:#475569;font-size:14px;">
        Your submission for <strong style="color:#0f172a;">{exam_title}</strong> has been graded.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;border-radius:50%;width:100px;height:100px;
                    background:{score_color}18;border:3px solid {score_color};
                    line-height:94px;">
          <span style="font-family:monospace;font-size:26px;font-weight:700;
                       color:{score_color};">{score:.1f}%</span>
        </div>
        <div style="margin-top:12px;">
          <span style="background:{badge_color};color:white;font-size:11px;font-weight:700;
                       padding:4px 12px;border-radius:20px;font-family:monospace;
                       letter-spacing:0.08em;">{badge_text}</span>
        </div>
      </div>
      <div style="border-top:1px solid #f1f5f9;padding-top:20px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
          Log in to QuizMaster to view your detailed question breakdown and download your result PDF.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
"""
    await send_email(
        to=student_email,
        subject=f'Your results for "{exam_title}" — {score:.1f}%',
        html=html,
    )
