import asyncio
import json
import logging

import aio_pika

from app.core.config import settings
from app.services.notification_service import process_notification

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

RABBITMQ_URL = settings.RABBITMQ_URL
CONNECT_RETRY_DELAY_SECONDS = 5


async def consume_notifications() -> None:
    """Consume messages from RabbitMQ with reconnect on startup/network failures."""
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            logger.info("Connected to RabbitMQ")

            async with connection:
                channel = await connection.channel()
                queue = await channel.declare_queue("notifications", durable=True)

                logger.info("Notification worker is waiting for messages...")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process():
                            try:
                                notification = json.loads(message.body.decode())
                                logger.info("Received notification: %s", notification)
                                await process_notification(notification)
                            except Exception as exc:
                                logger.exception("Error processing message: %s", exc)
        except Exception as exc:
            logger.warning(
                "RabbitMQ unavailable (%s). Retrying in %s seconds...",
                exc,
                CONNECT_RETRY_DELAY_SECONDS,
            )
            await asyncio.sleep(CONNECT_RETRY_DELAY_SECONDS)


async def main() -> None:
    await consume_notifications()


if __name__ == "__main__":
    asyncio.run(main())
