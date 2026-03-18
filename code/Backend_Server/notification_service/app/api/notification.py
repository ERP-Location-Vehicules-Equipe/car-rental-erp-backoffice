from fastapi import APIRouter
from app.schemas.notification import NotificationRequest
from app.messaging.producer import send_to_queue

router = APIRouter()

@router.post("/notify")
async def notify(request: NotificationRequest):
    print("Received notification:", request.dict())
    await send_to_queue(request.dict())
    return {"message": "Queued"}
