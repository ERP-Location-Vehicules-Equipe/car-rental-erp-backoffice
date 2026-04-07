from typing import Dict, Any

def get_content(notification: Dict[str, Any]) -> tuple:
    """Generate email subject and body for internal users (employees)"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    car_name = notification.get("car_name", "your vehicle")
    car_id = notification.get("car_id", "N/A")
    source_agency = notification.get("source_agency", "Source Agency")
    destination_agency = notification.get("destination_agency", "Destination Agency")
    depart_date = notification.get("depart_date", "")
    arrival_date = notification.get("arrival_date", "")

    if notification_type == "transfer":
        subject = f"Car Transfer Initiated - {car_name}"
        body = f"""
        <h2>Car Transfer Initiated</h2>
        <p>A vehicle transfer has been scheduled.</p>
        <p>Vehicle: <b>{car_name}</b> (ID: {car_id})</p>
        <ul>
            <li>From: {source_agency}</li>
            <li>To: {destination_agency}</li>
            <li>Departure Date: {depart_date}</li>
            <li>Expected Arrival: {arrival_date}</li>
        </ul>
        <p>Handled by: {user_name}</p>
        <p>Please ensure the vehicle is prepared and all transfer procedures are completed.</p>
        """

    elif notification_type == "canceled_transfer":
        subject = f"Car Transfer Cancelled - {car_name}"
        body = f"""
        <h2>Car Transfer Cancelled</h2>
        <p>The scheduled vehicle transfer has been cancelled.</p>
        <p>Vehicle: <b>{car_name}</b> (ID: {car_id})</p>
        <ul>
            <li>From: {source_agency}</li>
            <li>To: {destination_agency}</li>
            <li>Original Departure Date: {depart_date}</li>
            <li>Expected Arrival: {arrival_date}</li>
        </ul>
        <p>Please update vehicle availability and inform relevant teams if necessary.</p>
        """

    else:
        subject = "Car Transfer Notification"
        body = f"""
        <h2>Car Transfer Notification</h2>
        <p>There is an update regarding a vehicle transfer.</p>
        <p>Vehicle: <b>{car_name}</b> (ID: {car_id})</p>
        <p>From: {source_agency} → To: {destination_agency}</p>
        <p>Handled by: {user_name}</p>
        <p>Please review the details and take appropriate action.</p>
        """

    return subject, body
