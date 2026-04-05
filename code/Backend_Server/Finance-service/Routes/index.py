from fastapi import APIRouter

from .FactureRoutes import router as facture_router
from .PaiementRoutes import router as paiement_router
from .CompteRoutes import router as compte_router
from .ChargeRoutes import router as charge_router
from .RapportRoutes import router as rapport_router

router = APIRouter()

router.include_router(facture_router)
router.include_router(paiement_router)
router.include_router(compte_router)
router.include_router(charge_router)
router.include_router(rapport_router)
