from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

try:
    Base.metadata.create_all(bind=engine)
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
