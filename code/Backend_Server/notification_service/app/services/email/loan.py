import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def get_content(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body for internal users (employees)"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    loan_time = notification.get("loan_time", "")

    car_name = notification.get("car_name", "your vehicle")
    car_id = notification.get("car_id", "N/A")
    source_agency = notification.get("source_agency", "Source Agency")
    destination_agency = notification.get("destination_agency", "Destination Agency")
    depart_date = notification.get("depart_date", "")
    arrival_date = notification.get("arrival_date", "")

    if notification_type == "created":
        subject = "New Car Rental Created"
        body = f"""
        <h2>New Car Rental Created</h2>
        <p>A new rental has been created for <b>{client_name}</b>.</p>
        <p>Vehicle: {car_name}</p>
        <p>Scheduled time: {loan_time}</p>
        <p>Handled by: {user_name}</p>
        <p>Please ensure all required documents and vehicle preparations are completed before pickup.</p>
        """

    elif notification_type == "updated":
        subject = "Car Rental Updated"
        body = f"""
        <h2>Car Rental Updated</h2>
        <p>The rental for <b>{client_name}</b> has been updated.</p>
        <p>Vehicle: {car_name}</p>
        <p>New schedule: {loan_time}</p>
        <p>Handled by: {user_name}</p>
        <p>Review the changes and take action if necessary.</p>
        """

    elif notification_type == "canceled_loan":
        subject = "Car Rental Cancelled"
        body = f"""
        <h2>Car Rental Cancelled</h2>
        <p>The rental for <b>{client_name}</b> has been cancelled.</p>
        <p>Vehicle: {car_name}</p>
        <p>Scheduled time: {loan_time}</p>
        <p>Please update availability and notify relevant teams if required.</p>
        """

    elif notification_type == "status_updated":
        status = notification.get("status", "updated")
        subject = f"Rental Status Updated: {status.capitalize()}"
        body = f"""
        <h2>Rental Status Updated</h2>
        <p>The status of the rental for <b>{client_name}</b> has changed.</p>
        <p>Vehicle: {car_name}</p>
        <p>Scheduled time: {loan_time}</p>
        <p>New status: <b>{status}</b></p>
        <p>Handled by: {user_name}</p>
        <p>Ensure any required follow-up actions are completed.</p>
        """

    else:
        subject = "Car Rental Notification"
        body = f"""
        <h2>Car Rental Notification</h2>
        <p>There is an update regarding a rental for <b>{client_name}</b>.</p>
        <p>Vehicle: {car_name}</p>
        <p>Scheduled time: {loan_time}</p>
        <p>Handled by: {user_name}</p>
        <p>Please review the details and proceed accordingly.</p>
        """

    return subject, body
