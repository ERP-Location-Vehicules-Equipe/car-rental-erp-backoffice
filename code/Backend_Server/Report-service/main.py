from fastapi import FastAPI
from config.database import Base, engine
from Routes.ReportRoutes import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Report Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# create tables on startup
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# routes
app.include_router(router, prefix="/api")

# test route
@app.get("/")
def root():
    return {"message": "Report Service running"}