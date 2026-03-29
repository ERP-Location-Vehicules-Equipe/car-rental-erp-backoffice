from typing import Dict, Any

def get_content(notification: Dict[str, Any]) -> tuple:
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


