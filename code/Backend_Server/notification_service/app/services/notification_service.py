from app.services.email_service import send_email


def get_notification_content(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body based on notification type"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    loan_time = notification.get("loan_time", "")

    # Optional (if you add car later)
    car_name = notification.get("car_name", "your vehicle")

    if notification_type == "created":
        subject = "Car Rental Confirmation"
        body = f"""
        <h2>Car Rental Confirmation</h2>
        <p>Dear {client_name},</p>
        <p>Your car rental ({car_name}) has been successfully scheduled for {loan_time}.</p>
        <p>Handled by: {user_name}</p>
        <p>Please make sure to bring the required documents at pickup.</p>
        <p>If you need to modify or cancel your reservation, contact us in advance.</p>
        """

    elif notification_type == "updated":
        subject = "Car Rental Update"
        body = f"""
        <h2>Car Rental Update</h2>
        <p>Dear {client_name},</p>
        <p>Your rental ({car_name}) has been updated.</p>
        <p>New schedule: {loan_time}</p>
        <p>Handled by: {user_name}</p>
        <p>Please contact us if anything looks incorrect.</p>
        """

    elif notification_type == "cancelled":
        subject = "Car Rental Cancellation"
        body = f"""
        <h2>Car Rental Cancellation</h2>
        <p>Dear {client_name},</p>
        <p>Your rental ({car_name}) scheduled for {loan_time} has been cancelled.</p>
        <p>If this was not expected, please contact our support team.</p>
        """

    elif notification_type == "status_updated":
        status = notification.get("status", "updated")
        subject = f"Rental Status: {status.capitalize()}"
        body = f"""
        <h2>Rental Status Update</h2>
        <p>Dear {client_name},</p>
        <p>Your rental ({car_name}) scheduled for {loan_time} is now <b>{status}</b>.</p>
        <p>Handled by: {user_name}</p>
        <p>Contact us if you need assistance.</p>
        """

    else:
        subject = "Car Rental Notification"
        body = f"""
        <h2>Car Rental Notification</h2>
        <p>Dear {client_name},</p>
        <p>This is an update regarding your rental scheduled for {loan_time}.</p>
        <p>Handled by: {user_name}</p>
        """

    return subject, body


# ---------------- PROCESS ---------------- #

async def process_notification(notification: Dict[str, Any]) -> None:
    """Process a notification message"""
    try:
        client_email = notification.get("client_email")

        if not client_email:
            logger.error("No client email in notification")
            return

        subject, body = get_notification_content(notification)
        await send_email(client_email, subject, body)

    except Exception as e:
        logger.error(f"Error processing notification: {e}")
