from sqlalchemy import Column, Integer, String, Boolean
from config.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True)

    password = Column(String)

    role = Column(String, default="user")

    is_active = Column(Boolean, default=True)