from fastapi import FastAPI
from config.database import Base, engine
from Routes.index import router

app = FastAPI(
    title="Auth Service",
    version="1.0.0"
)

# =========================
# Database Initialization
# =========================

try:
    Base.metadata.create_all(bind=engine)
    print("Database connected successfully")

except Exception as e:
    print("Database connection failed")


# =========================
# Routes
# =========================

app.include_router(router, prefix="/api")


# =========================
# Root Endpoint
# =========================

@app.get("/")
def root():
    return {
        "service": "Auth Service",
        "status": "running"
    }

# =========================
# health check
# =========================
@app.get("/health")
def health_check():
    return {"status": "ok"}