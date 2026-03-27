from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # RabbitMQ
    RABBITMQ_URL: str

    # SMTP
    SMTP_SERVER: str
    SMTP_PORT: int
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str

    # App
    APP_NAME: str = "notification_service"
    DEBUG: bool = True

    class Config:
        env_file = "/.env"
        extra = "ignore"


settings = Settings()
