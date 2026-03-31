from typing import Dict, Any

def get_content(notification: Dict[str, Any]) -> tuple:
    """Generate short popup title and message for employees"""

    notification_type = notification.get("type")

    client_name = notification.get("client_name", "Client")
    user_name = notification.get("user_name", "Agent")
    loan_time = notification.get("loan_time", "")

    car_name = notification.get("car_name", "Vehicle")
    car_id = notification.get("car_id", "N/A")

    source_agency = notification.get("source_agency", "Source")
    destination_agency = notification.get("destination_agency", "Destination")
    depart_date = notification.get("depart_date", "")
    arrival_date = notification.get("arrival_date", "")

    # ---- LOAN EVENTS ----
    if notification_type == "created":
        title = "New Rental Created"
        message = f"{client_name} booked {car_name} for {loan_time}."

    elif notification_type == "updated":
        title = "Rental Updated"
        message = f"{client_name}'s rental ({car_name}) updated → {loan_time}."

    elif notification_type == "canceled_loan":
        title = "Rental Cancelled"
        message = f"{client_name}'s rental ({car_name}) at {loan_time} was cancelled."

    elif notification_type == "status_updated":
        status = notification.get("status", "updated")
        title = f"Rental {status.capitalize()}"
        message = f"{car_name} ({client_name}) is now {status}."

    # ---- TRANSFER EVENTS ----
    elif notification_type == "transfer":
        title = "Car Transfer Started"
        message = (
            f"{car_name} (ID: {car_id}) → {destination_agency} "
            f"(from {source_agency}, {depart_date})"
        )

    elif notification_type == "canceled_transfer":
        title = "Transfer Cancelled"
        message = (
            f"{car_name} (ID: {car_id}) transfer cancelled "
            f"({source_agency} → {destination_agency})"
        )

    # ---- DEFAULT ----
    else:
        title = "Notification"
        message = f"Update on {car_name} for {client_name}."

    return title, message
