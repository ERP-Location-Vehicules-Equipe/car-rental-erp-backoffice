from dotenv import load_dotenv
import os

load_dotenv()  # كيقرا .env من root

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

print("DATABASE_URL =", DATABASE_URL)  # باش نتأكدو
