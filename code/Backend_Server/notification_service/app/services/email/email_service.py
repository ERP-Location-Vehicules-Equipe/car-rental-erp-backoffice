import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, body: str) -> None:
    """Send an email notification via a real SMTP provider (e.g., Resend/Brevo)"""
    try:
        message = MIMEMultipart()
        message["From"] = settings.EMAIL_FROM
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        smtp = aiosmtplib.SMTP(
            hostname=settings.SMTP_SERVER,
            port=settings.SMTP_PORT,
            use_tls=True, # Use False + starttls() for port 587
        )

        await smtp.connect()

        # Authenticate with your API key or SMTP password
        await smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        await smtp.send_message(message)
        await smtp.quit()

        logger.info(f"Email successfully sent to {to}")

    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
