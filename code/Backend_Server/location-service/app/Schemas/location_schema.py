from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# =========================
# ✅ CREATE / UPDATE
# =========================
class LocationCreate(BaseModel):
    client_id: int
    vehicle_id: int
    agence_depart_id: int
    agence_retour_id: int

    date_debut: datetime
    date_fin_prevue: datetime
    date_retour_reelle: Optional[datetime] = None

    tarif_jour: float

    # default status
    etat: Optional[str] = "en_cours"


# =========================
# ✅ RESPONSE
# =========================
class LocationResponse(LocationCreate):
    id: int
    montant_total: float
    created_at: datetime

    class Config:
        from_attributes = True   # 🔥 FIX Pydantic V2