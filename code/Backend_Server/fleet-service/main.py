from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from controllers.maintenance_controller import router as maintenance_router
from controllers.vehicle_controller import router as vehicle_router
from db import Base, engine
from models.maintenance import VehicleMaintenance
from models.vehicle import Vehicle

app = FastAPI()

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):517\d",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def sync_vehicle_schema() -> None:
    inspector = inspect(engine)

    if "vehicles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("vehicles")}

    if "nombre_places" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE vehicles ADD COLUMN nombre_places INTEGER")
            )


sync_vehicle_schema()

app.include_router(vehicle_router)
app.include_router(maintenance_router)


@app.get("/")
def home():
    return {"message": "Fleet Service running"}
