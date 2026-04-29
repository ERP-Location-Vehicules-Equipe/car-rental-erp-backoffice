import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, body: str) -> None:
    """Send an email notification through configured SMTP."""
    try:
        message = MIMEMultipart()
        message["From"] = f"ERP Location Support <{settings.EMAIL_FROM}>"
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))

        use_tls = int(settings.SMTP_PORT) == 465
        smtp = aiosmtplib.SMTP(
            hostname=settings.SMTP_SERVER,
            port=settings.SMTP_PORT,
            use_tls=use_tls,
        )

        await smtp.connect()
        if not use_tls:
            await smtp.starttls()

        await smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        await smtp.send_message(message)
        await smtp.quit()

        logger.info("Email successfully sent to %s", to)

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to, e)
