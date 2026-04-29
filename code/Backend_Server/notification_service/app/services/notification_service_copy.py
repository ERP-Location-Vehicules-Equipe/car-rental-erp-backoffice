from app.services.email_service import send_email
from typing import Dict, Any
import logging



logger = logging.getLogger(__name__)


def get_notification_content_loan(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body based on notification type"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    loan_time = notification.get("loan_time", "")

    car_name = notification.get("car_name", "your vehicle")
    car_id = notification.get("car_id", "N/A")  # for transfer
    source_agency = notification.get("source_agency", "Source Agency")
    destination_agency = notification.get("destination_agency", "Destination Agency")
    depart_date = notification.get("depart_date", "")
    arrival_date = notification.get("arrival_date", "")

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

    elif notification_type == "canceled_loan":
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


def get_notification_content_transfer(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body based on notification type"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    car_name = notification.get("car_name", "your vehicle")
    car_id = notification.get("car_id", "N/A")  # for transfer
    source_agency = notification.get("source_agency", "Source Agency")
    destination_agency = notification.get("destination_agency", "Destination Agency")
    depart_date = notification.get("depart_date", "")
    arrival_date = notification.get("arrival_date", "")

    if notification_type == "transfer":
        subject = f"Car Transfer Notification - {car_name}"
        body = f"""
        <h2>Car Transfer Notification</h2>
        <p>Dear {client_name},</p>
        <p>The car <b>{car_name}</b> (ID: {car_id}) is being transferred:</p>
        <ul>
            <li>From: {source_agency}</li>
            <li>To: {destination_agency}</li>
            <li>Departure Date: {depart_date}</li>
            <li>Expected Arrival: {arrival_date}</li>
        </ul>
        <p>Handled by: {user_name}</p>
        <p>Please contact the agencies if you have any questions regarding this transfer.</p>
        """

    elif notification_type == "canceled_transfer":
        car_id = notification.get("car_id", "N/A")
        source_agency = notification.get("source_agency", "Source Agency")
        destination_agency = notification.get("destination_agency", "Destination Agency")
        depart_date = notification.get("depart_date", "")
        arrival_date = notification.get("arrival_date", "")
    
        subject = f"Car Transfer Cancellation - {car_name}"
        body = f"""
        <h2>Car Transfer Cancellation</h2>
        <p>Dear {client_name},</p>
        <p>The car <b>{car_name}</b> (ID: {car_id}) transfer has been cancelled.</p>
        <ul>
            <li>From: {source_agency}</li>
            <li>To: {destination_agency}</li>
            <li>Original Departure Date: {depart_date}</li>
            <li>Expected Arrival: {arrival_date}</li>
        </ul>
        <p>If this was not expected, please contact the respective agencies.</p>
        """


    return subject, body



# ------------------------------processing----------------------
async def process_notification(notification: Dict[str, Any]) -> None:
    """Process a notification message"""
    try:
        client_email = notification.get("client_email")

        if not client_email:
            logger.error("No client email in notification")
            return
        if "transfer" in notification.get("type", ""):
            subject, body = get_notification_content_transfer(notification)
        elif "loan" in notification.get("type", ""):
            subject, body = get_notification_content_loan(notification)
        else:
            logger.warning(f"Unknown notification type: {notification.get('type')}")
            return

        await send_email(client_email, subject, body)

    except Exception as e:
        logger.error(f"Error processing notification: {e}")

