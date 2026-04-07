from fastapi import APIRouter
from app.schemas.notification import NotificationRequest
from app.messaging.producer import send_to_queue
from app.services.popup.handler import handle_popup_sync

router = APIRouter()

@router.post("/notify")
async def notify(request: NotificationRequest):
    data = request.dict()
    print("Received notification:", data)

    channels = data.get("channels", ["email"])

    popup_data = None

    #  Send to queue (async processing)
    if "email" in channels:
        await send_to_queue(data)

    #  Handle popup immediately
    if "popup" in channels:
        popup_data = handle_popup_sync(data)

    return {
        "message": "Processed",
        "popup": popup_data
    }
