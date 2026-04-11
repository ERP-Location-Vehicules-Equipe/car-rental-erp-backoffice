import os
import sys
from pathlib import Path

_SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(_SERVICE_ROOT))

# Avant create_engine dans config.database (import main)
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_report.db")

import pytest  # noqa: E402

import main  # noqa: F401, E402 — enregistre Report sur Base.metadata
from config.database import Base, engine  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """TestClient n'appelle pas toujours on_event('startup') → schéma explicite."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
