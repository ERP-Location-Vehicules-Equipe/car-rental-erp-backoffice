import asyncio
import json
import logging
from app.services.notification_service import process_notification

import aio_pika  # <-- this was missing

from app.core.config import settings  # if you have settings in app/core/config.py

RABBITMQ_URL = settings.RABBITMQ_URL  # or just put the URL directly for testing

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)



async def main() -> None:
    """Consume messages from RabbitMQ"""

    connection = await aio_pika.connect_robust(RABBITMQ_URL)

    async with connection:
        channel = await connection.channel()

        queue = await channel.declare_queue("notifications", durable=True)

        logger.info("Notification service started. Waiting for messages...")

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        notification = json.loads(message.body.decode())
                        logger.info(f"Received notification: {notification}")

                        await process_notification(notification)

                    except Exception as e:
                        logger.error(f"Error processing message: {e}")


if __name__ == "__main__":
    asyncio.run(main())
