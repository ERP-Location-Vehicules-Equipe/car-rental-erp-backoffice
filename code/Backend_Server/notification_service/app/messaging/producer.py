import json
from datetime import datetime
import aio_pika
from app.core.config import settings

async def send_to_queue(message: dict):
    # Convert datetime fields to ISO string
    for key, value in message.items():
        if isinstance(value, datetime):
            message[key] = value.isoformat()

    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)

    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue("notifications", durable=True)

        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key=queue.name,
        )
