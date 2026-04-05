from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from Model.FinanceModels import Facture, Paiement, Charge


# ==============================
# Rapport Financier Global
# ==============================

def get_rapport_financier(db: Session):

    total_factures = db.query(
        func.coalesce(func.sum(Facture.montant_ttc), 0)
    ).filter(Facture.deleted_at == None).scalar()

    total_paiements = db.query(
        func.coalesce(func.sum(Paiement.montant), 0)
    ).filter(Paiement.deleted_at == None).scalar()

    total_charges = db.query(
        func.coalesce(func.sum(Charge.montant), 0)
    ).filter(Charge.deleted_at == None).scalar()

    factures_en_attente = db.query(func.count(Facture.id)).filter(
        Facture.statut == "en_attente",
        Facture.deleted_at == None
    ).scalar()

    factures_payees = db.query(func.count(Facture.id)).filter(
        Facture.statut == "payée",
        Facture.deleted_at == None
    ).scalar()

    solde_net = Decimal(str(total_paiements)) - Decimal(str(total_charges))

    return {
        "total_factures": total_factures,
        "total_paiements": total_paiements,
        "total_charges": total_charges,
        "solde_net": solde_net,
        "factures_en_attente": factures_en_attente,
        "factures_payees": factures_payees
    }
