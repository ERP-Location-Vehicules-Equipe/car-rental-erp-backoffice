from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from controllers.categorie_controller import router as categorie_router
from controllers.entretien_controller import router as entretien_router
from controllers.marque_controller import router as marque_router
from controllers.modele_controller import router as modele_router
from controllers.vehicle_controller import router as vehicle_router
from db import Base, engine
from models.categorie import Categorie
from models.entretien import VehicleEntretien
from models.marque import Marque
from models.modele import Modele
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


def migrate_legacy_entretien_schema() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    legacy_table_name = "vehicle_" + "mainte" + "nances"
    legacy_type_column = "type_" + "mainte" + "nance"

    if legacy_table_name in table_names and "vehicle_entretiens" not in table_names:
        with engine.begin() as connection:
            connection.execute(
                text(f"ALTER TABLE {legacy_table_name} RENAME TO vehicle_entretiens")
            )
        inspector = inspect(engine)

    if "vehicle_entretiens" not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("vehicle_entretiens")
    }

    if legacy_type_column in existing_columns and "type_entretien" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE vehicle_entretiens "
                    f"RENAME COLUMN {legacy_type_column} TO type_entretien"
                )
            )


migrate_legacy_entretien_schema()
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

    if "photo_url" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE vehicles ADD COLUMN photo_url VARCHAR")
            )


def sync_entretien_schema() -> None:
    inspector = inspect(engine)

    if "vehicle_entretiens" not in inspector.get_table_names():
        return

    foreign_keys = inspector.get_foreign_keys("vehicle_entretiens")

    for foreign_key in foreign_keys:
        if foreign_key.get("constrained_columns") == ["vehicle_id"]:
            constraint_name = foreign_key.get("name")
            if constraint_name:
                with engine.begin() as connection:
                    connection.execute(
                        text(
                            "ALTER TABLE vehicle_entretiens "
                            f"DROP CONSTRAINT IF EXISTS {constraint_name}"
                        )
                    )


sync_vehicle_schema()
sync_entretien_schema()

app.include_router(vehicle_router)
app.include_router(entretien_router)
app.include_router(categorie_router)
app.include_router(marque_router)
app.include_router(modele_router)


@app.get("/")
def home():
    return {"message": "Fleet Service running"}
