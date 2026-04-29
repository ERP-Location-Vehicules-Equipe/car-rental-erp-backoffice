from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from config.database import Base, engine
from Routes.index import router

app = FastAPI(
    title="Finance Service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _add_column_if_missing(table: str, column: str, ddl: str) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return

    columns = {item["name"] for item in inspector.get_columns(table)}
    if column in columns:
        return

    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))


def sync_finance_schema() -> None:
    _add_column_if_missing("comptes_tresorerie", "agence_id", "BIGINT")
    _add_column_if_missing("paiements", "location_id", "BIGINT")
    _add_column_if_missing("charges", "compte_id", "BIGINT")
    _add_column_if_missing("charges", "source_type", "VARCHAR")
    _add_column_if_missing("charges", "source_ref_id", "BIGINT")

    # Backfill paiement.location_id from facture relation
    with engine.begin() as connection:
        if engine.dialect.name == "postgresql":
            connection.execute(
                text(
                    """
                    UPDATE paiements p
                    SET location_id = f.location_id
                    FROM factures f
                    WHERE p.location_id IS NULL
                      AND p.facture_id = f.id
                    """
                )
            )
        else:
            connection.execute(
                text(
                    """
                    UPDATE paiements
                    SET location_id = (
                        SELECT f.location_id
                        FROM factures f
                        WHERE f.id = paiements.facture_id
                    )
                    WHERE location_id IS NULL
                    """
                )
            )

        # Normalize legacy facture statuses
        connection.execute(
            text(
                """
                UPDATE factures
                SET statut = 'payee'
                WHERE lower(coalesce(statut, '')) IN ('validee', 'paye')
                """
            )
        )

        # Keep only one active compte per agence (oldest one wins).
        if engine.dialect.name == "postgresql":
            connection.execute(
                text(
                    """
                    UPDATE comptes_tresorerie c
                    SET deleted_at = NOW()
                    WHERE c.deleted_at IS NULL
                      AND c.agence_id IS NOT NULL
                      AND EXISTS (
                        SELECT 1
                        FROM comptes_tresorerie c2
                        WHERE c2.agence_id = c.agence_id
                          AND c2.deleted_at IS NULL
                          AND c2.id < c.id
                    )
                    """
                )
            )
        else:
            connection.execute(
                text(
                    """
                    UPDATE comptes_tresorerie
                    SET deleted_at = CURRENT_TIMESTAMP
                    WHERE deleted_at IS NULL
                      AND agence_id IS NOT NULL
                      AND id NOT IN (
                        SELECT MIN(id)
                        FROM comptes_tresorerie
                        WHERE deleted_at IS NULL
                          AND agence_id IS NOT NULL
                        GROUP BY agence_id
                    )
                    """
                )
            )


try:
    Base.metadata.create_all(bind=engine)
    sync_finance_schema()
    print("Database connected successfully")
except Exception as e:
    print(f"Database connection failed: {e}")

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "Finance Service",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
