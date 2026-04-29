from config.database import SessionLocal

# dependency كتستعمل ف FastAPI باش تعطي DB لكل request
def get_db():
    db = SessionLocal()  # فتح connection
    try:
        yield db          # نعطيه للroute
    finally:
        db.close()       # نسدو connection