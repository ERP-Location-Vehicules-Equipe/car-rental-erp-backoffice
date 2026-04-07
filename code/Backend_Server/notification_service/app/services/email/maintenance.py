import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def get_content(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body for internal users (employees)"""

    notification_type = notification.get("type")

    maintenance_due_date = notification.get("maintenance_due_date", "")
    car_name = notification.get("car_name", "your vehicle")
    car_id = notification.get("car_id", "N/A")

    if notification_type == "maintenance_due":
        subject = "Vehicle Maintenance Due"
        body = f"""
        <h2>Vehicle Maintenance Due</h2>
        <p>The following vehicle requires maintenance:</p>
        <p><b>Vehicle:</b> {car_name} (ID: {car_id})</p>
        <p><b>Due Date:</b> {maintenance_due_date}</p>
        <p>Please ensure that maintenance is scheduled and completed before the due date to avoid operational issues.</p>
        """
    else:
        subject = "Notification"
        body = "<p>No content available for this notification type.</p>"

    return subject, body
