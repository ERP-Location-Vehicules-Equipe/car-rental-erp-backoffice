from fastapi import APIRouter, Depends

# 🔥 SECURITY
from dependencies.FinanceDependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_stats(user=Depends(get_current_user)):
    return {
        "revenu_total": 15000,
        "charges_total": 5000,
        "benefice": 10000,
        "nb_factures": 12
    }