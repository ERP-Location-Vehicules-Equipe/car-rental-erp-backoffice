async def process_notification(notification: dict):
    channels = notification.get("channels", ["email"])

    if "email" in channels:
        from app.services.email.handler import handle_email
        await handle_email(notification)

    if "popup" in channels:
        from app.services.popup.handler import handle_popup
        await handle_popup(notification)
