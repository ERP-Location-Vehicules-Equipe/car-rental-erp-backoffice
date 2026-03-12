from fastapi import FastAPI

from config.database import Base, engine

from Routes.AuthRoute import router

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Auth Service Running"}