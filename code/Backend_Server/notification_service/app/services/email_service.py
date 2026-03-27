import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, body: str) -> None:
    """Send an email notification via local MailHog"""
    try:
        message = MIMEMultipart()
        message["From"] = "test@example.com"  # MailHog just needs any sender
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        smtp = aiosmtplib.SMTP(
            hostname="mailhog",
            port=1025,      # MailHog default SMTP port
            use_tls=False,  # plain SMTP
        )
        await smtp.connect()
        await smtp.send_message(message)
        await smtp.quit()

        print(f"Email sent to {to}")

    except Exception as e:
        print(f"Failed to send email: {e}")
