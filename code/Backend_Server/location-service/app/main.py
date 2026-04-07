from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.database import engine, Base
from app.Routes.location_routes import router as location_router

# create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Location Service",
    version="1.0.0"
)

# 🔥 CORS FIX (IMPORTANT)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ف dev خليه *
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routers
app.include_router(location_router)


@app.get("/")
def root():
    return {"message": "Location Service is running "}