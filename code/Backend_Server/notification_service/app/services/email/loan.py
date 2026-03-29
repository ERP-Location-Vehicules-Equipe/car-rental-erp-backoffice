import logging
from typing import Dict, Any


logger = logging.getLogger(__name__)


def get_content(notification: Dict[str, Any]) -> tuple:
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


