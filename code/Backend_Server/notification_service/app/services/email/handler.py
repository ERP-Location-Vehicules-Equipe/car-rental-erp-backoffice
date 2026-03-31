async def handle_email(notification: dict):
    notif_type = notification.get("type", "")

    if "transfer" in notif_type:
        from .transfer import get_content
    else:
        from .loan import get_content

    subject, body = get_content(notification)

    from app.services.email.email_service import send_email
    await send_email(notification["user_email"], subject, body)
