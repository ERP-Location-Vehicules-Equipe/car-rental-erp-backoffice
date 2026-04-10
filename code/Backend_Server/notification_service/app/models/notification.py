from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text

from app.db.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(255), nullable=True)

    scope = Column(String(20), nullable=False, default="agence")
    agence_id = Column(Integer, nullable=True, index=True)

    channels = Column(String(100), nullable=False, default="popup")
    metadata_json = Column(JSON, nullable=True)

    created_by_user_id = Column(Integer, nullable=True)
    created_by_role = Column(String(30), nullable=True)
    created_by_email = Column(String(255), nullable=True)

    email_sent = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class NotificationRead(Base):
    __tablename__ = "notification_reads"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    read_at = Column(DateTime, default=datetime.utcnow, nullable=False)
