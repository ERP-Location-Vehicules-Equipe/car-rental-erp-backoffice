from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from Controller.ScopeController import get_allowed_location_ids
from Model.FinanceModels import Charge, Facture, Paiement
from dependencies.FinanceDependencies import AuthContext


def get_rapport_financier(db: Session, user: AuthContext):
    location_scope = get_allowed_location_ids(user)

    factures_query = db.query(Facture).filter(Facture.deleted_at == None)
    paiements_query = db.query(Paiement).join(Facture, Facture.id == Paiement.facture_id).filter(
        Paiement.deleted_at == None,
        Facture.deleted_at == None,
    )
    charges_query = db.query(Charge).filter(Charge.deleted_at == None)

    if not user.is_super_admin:
        if not location_scope:
            factures_query = factures_query.filter(Facture.id == -1)
            paiements_query = paiements_query.filter(Paiement.id == -1)
        else:
            factures_query = factures_query.filter(Facture.location_id.in_(location_scope))
            paiements_query = paiements_query.filter(Facture.location_id.in_(location_scope))

        charges_query = charges_query.filter(Charge.agence_id == user.agence_id)

    total_factures = factures_query.with_entities(func.coalesce(func.sum(Facture.montant_ttc), 0)).scalar() or 0
    total_paiements = paiements_query.with_entities(func.coalesce(func.sum(Paiement.montant), 0)).scalar() or 0
    total_charges = charges_query.with_entities(func.coalesce(func.sum(Charge.montant), 0)).scalar() or 0

    factures_en_attente = factures_query.filter(Facture.statut == "en_attente").count()
    factures_payees = factures_query.filter(Facture.statut.in_(["validee", "payee", "paye"])).count()

    solde_net = Decimal(str(total_paiements)) - Decimal(str(total_charges))

    return {
        "total_factures": total_factures,
        "total_paiements": total_paiements,
        "total_charges": total_charges,
        "solde_net": solde_net,
        "factures_en_attente": factures_en_attente,
        "factures_payees": factures_payees,
    }
