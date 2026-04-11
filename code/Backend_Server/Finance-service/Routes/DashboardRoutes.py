from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from Controller.DashboardController import get_dashboard_stats
from config.database import get_db
from dependencies.FinanceDependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return get_dashboard_stats(db, user)