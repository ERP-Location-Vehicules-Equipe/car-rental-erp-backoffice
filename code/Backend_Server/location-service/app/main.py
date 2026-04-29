import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.database import Base, engine
from app.Model.location import Location
from app.Routes.location_routes import router as location_router

logger = logging.getLogger("location_service")

app = FastAPI(
    title="Location Service",
    version="1.0.0",
)

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


def sync_location_schema() -> None:
    inspector = inspect(engine)
    if "locations" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("locations")}

    if "created_at" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE locations ADD COLUMN created_at TIMESTAMP")
            )

    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE locations SET created_at = CURRENT_TIMESTAMP "
                "WHERE created_at IS NULL"
            )
        )

    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE locations SET etat = 'terminee' "
                "WHERE lower(etat) IN ('terminee', 'terminée')"
            )
        )
        connection.execute(
            text(
                "UPDATE locations SET etat = 'annulee' "
                "WHERE lower(etat) IN ('annulee', 'annulée')"
            )
        )
        connection.execute(
            text(
                "UPDATE locations SET etat = 'en_cours' "
                "WHERE lower(etat) IN ('en_cours', 'encours')"
            )
        )

    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE locations "
                    "ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP"
                )
            )


sync_location_schema()

app.include_router(location_router)


def _to_json_safe(value):
    if isinstance(value, dict):
        return {str(key): _to_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_to_json_safe(item) for item in value]
    if isinstance(value, BaseException):
        return str(value)
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    raw_errors = exc.errors()
    errors = _to_json_safe(raw_errors)
    first_message = None
    if isinstance(errors, list) and len(errors) > 0 and isinstance(errors[0], dict):
        first_message = errors[0].get("msg")

    return JSONResponse(
        status_code=422,
        content={
            "detail": first_message or "Invalid input data",
            "errors": errors,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_, exc: Exception):
    logger.exception("Unhandled error in location-service: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
def root():
    return {"message": "Location Service running"}
