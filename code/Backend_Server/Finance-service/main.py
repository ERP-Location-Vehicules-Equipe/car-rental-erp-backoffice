from fastapi import FastAPI
from config.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
from Routes.index import router

app = FastAPI(
    title="Finance Service",
    version="1.0.0"
)

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],  # ✅ explicit origins (required with credentials=True)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Database Initialization
# =========================

try:
    Base.metadata.create_all(bind=engine)
    print("Database connected successfully")

except Exception as e:
    print(f"Database connection failed: {e}")


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
        "service": "Finance Service",
        "status": "running"
    }

# =========================
# Health Check
# =========================

@app.get("/health")
def health_check():
    return {"status": "ok"}