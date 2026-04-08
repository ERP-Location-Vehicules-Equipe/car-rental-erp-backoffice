from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.models.transfer import Transfer
from app.routes.transfer_routes import router as transfer_router

app = FastAPI(title="Transfer Service", version="1.0.0")

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transfer_router)


@app.get("/")
def root():
    return {"message": "Transfer Service is running"}
