from .content import get_content



def handle_popup_sync(notification: dict):
    notif_type = notification.get("type", "")
    title, message = get_content(notification)

    return {
        "title": title,
        "message": message
    }
