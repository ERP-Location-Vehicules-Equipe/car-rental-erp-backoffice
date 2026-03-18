from fastapi import APIRouter
from app.schemas.notification import NotificationRequest
from app.messaging.producer import send_to_queue

router = APIRouter()

@router.post("/notify")
async def notify(request: NotificationRequest):
    await send_to_queue(request.dict())
    return {"message": "Queued"}
