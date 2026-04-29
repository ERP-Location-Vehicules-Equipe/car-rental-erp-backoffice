from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from Controller.RapportController import get_rapport_financier
from Schemas.FinanceSchemas import RapportFinancierSchema

# 🔥 SECURITY
from dependencies.FinanceDependencies import get_current_user

router = APIRouter(prefix="/rapport", tags=["Rapport Financier"])


@router.get("/", response_model=RapportFinancierSchema)
def rapport(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return get_rapport_financier(db, user)
