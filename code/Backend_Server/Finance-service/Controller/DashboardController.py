from datetime import datetime
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from Controller.ScopeController import get_allowed_location_ids
from Model.FinanceModels import Charge, CompteTresorerie, Facture, Paiement
from dependencies.FinanceDependencies import AuthContext


def _to_float(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _month_key(value: datetime | None) -> str | None:
    if not isinstance(value, datetime):
        return None
    return value.strftime("%Y-%m")


def _last_month_keys(count: int = 6) -> list[str]:
    now = datetime.utcnow()
    base_year = now.year
    base_month = now.month

    keys: list[str] = []
    for shift in range(count - 1, -1, -1):
        year = base_year
        month = base_month - shift
        while month <= 0:
            year -= 1
            month += 12
        keys.append(f"{year:04d}-{month:02d}")
    return keys


def get_dashboard_stats(db: Session, user: AuthContext):
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

    factures_rows = factures_query.with_entities(Facture.date_emission, Facture.montant_ttc, Facture.statut).all()
    paiements_rows = paiements_query.with_entities(Paiement.date_paiement, Paiement.montant).all()
    charges_rows = charges_query.with_entities(Charge.date_charge, Charge.montant, Charge.type).all()

    revenu_total = sum(_to_float(row[1]) for row in factures_rows)
    paiements_total = sum(_to_float(row[1]) for row in paiements_rows)
    charges_total = sum(_to_float(row[1]) for row in charges_rows)

    benefice = revenu_total - charges_total
    net_tresorerie = paiements_total - charges_total

    nb_factures = len(factures_rows)
    factures_en_attente = sum(1 for row in factures_rows if str(row[2]).lower() == "en_attente")
    factures_payees = sum(1 for row in factures_rows if str(row[2]).lower() in {"validee", "payee", "paye"})

    month_keys = _last_month_keys(6)
    monthly_map = {
        key: {
            "month": key,
            "revenue": 0.0,
            "charges": 0.0,
            "paiements": 0.0,
            "profit": 0.0,
        }
        for key in month_keys
    }

    for date_value, amount, _status in factures_rows:
        key = _month_key(date_value)
        if key in monthly_map:
            monthly_map[key]["revenue"] += _to_float(amount)

    for date_value, amount in paiements_rows:
        key = _month_key(date_value)
        if key in monthly_map:
            monthly_map[key]["paiements"] += _to_float(amount)

    charge_type_map: dict[str, float] = {}
    for date_value, amount, charge_type in charges_rows:
        key = _month_key(date_value)
        if key in monthly_map:
            monthly_map[key]["charges"] += _to_float(amount)

        charge_key = (str(charge_type).strip().lower() or "autre")
        charge_type_map[charge_key] = charge_type_map.get(charge_key, 0.0) + _to_float(amount)

    monthly_overview = []
    for key in month_keys:
        bucket = monthly_map[key]
        bucket["profit"] = bucket["revenue"] - bucket["charges"]
        monthly_overview.append(bucket)

    charges_by_type = [
        {"type": key, "amount": round(value, 2)}
        for key, value in sorted(charge_type_map.items(), key=lambda item: item[1], reverse=True)
    ]

    factures_by_status = [
        {"status": "validee", "count": int(factures_payees)},
        {"status": "en_attente", "count": int(factures_en_attente)},
        {"status": "autres", "count": int(max(0, nb_factures - factures_payees - factures_en_attente))},
    ]

    agence_compte_solde = 0.0
    agence_compte_nom = None
    total_comptes_solde = 0.0
    agence_finance_stats: list[dict] = []

    if user.is_super_admin:
        comptes_rows = db.query(
            CompteTresorerie.agence_id,
            CompteTresorerie.id,
            CompteTresorerie.nom,
            CompteTresorerie.solde_actuel,
        ).filter(
            CompteTresorerie.deleted_at == None,
            CompteTresorerie.agence_id != None,
        ).all()

        charges_by_agence_rows = db.query(
            Charge.agence_id,
            func.coalesce(func.sum(Charge.montant), 0),
        ).filter(
            Charge.deleted_at == None,
            Charge.agence_id != None,
        ).group_by(Charge.agence_id).all()

        paiements_by_agence_rows = db.query(
            CompteTresorerie.agence_id,
            func.coalesce(func.sum(Paiement.montant), 0),
        ).join(
            CompteTresorerie,
            CompteTresorerie.id == Paiement.compte_id,
        ).filter(
            Paiement.deleted_at == None,
            CompteTresorerie.deleted_at == None,
            CompteTresorerie.agence_id != None,
        ).group_by(CompteTresorerie.agence_id).all()

        charges_map = {int(row[0]): _to_float(row[1]) for row in charges_by_agence_rows if row[0] is not None}
        paiements_map = {int(row[0]): _to_float(row[1]) for row in paiements_by_agence_rows if row[0] is not None}

        agence_ids = set(charges_map.keys()) | set(paiements_map.keys())
        compte_map: dict[int, dict] = {}
        for agence_id, compte_id, compte_nom, compte_solde in comptes_rows:
            if agence_id is None:
                continue
            agence_id_int = int(agence_id)
            agence_ids.add(agence_id_int)
            compte_map[agence_id_int] = {
                "compte_id": int(compte_id),
                "compte_nom": compte_nom,
                "solde_compte": _to_float(compte_solde),
            }

        for agence_id in sorted(agence_ids):
            compte_item = compte_map.get(agence_id, {})
            total_charges_agence = charges_map.get(agence_id, 0.0)
            total_paiements_agence = paiements_map.get(agence_id, 0.0)
            solde_compte = _to_float(compte_item.get("solde_compte", 0.0))
            total_comptes_solde += solde_compte

            agence_finance_stats.append(
                {
                    "agence_id": agence_id,
                    "compte_id": compte_item.get("compte_id"),
                    "compte_nom": compte_item.get("compte_nom"),
                    "solde_compte": round(solde_compte, 2),
                    "total_charges": round(total_charges_agence, 2),
                    "total_paiements": round(total_paiements_agence, 2),
                    "solde_operations": round(total_paiements_agence - total_charges_agence, 2),
                }
            )
    elif user.agence_id is not None:
        compte = db.query(CompteTresorerie).filter(
            CompteTresorerie.deleted_at == None,
            CompteTresorerie.agence_id == user.agence_id,
        ).order_by(CompteTresorerie.id.asc()).first()
        if compte:
            agence_compte_solde = _to_float(compte.solde_actuel)
            agence_compte_nom = compte.nom

    return {
        "scope": "global" if user.is_super_admin else "agence",
        "agence_id": user.agence_id,
        "revenu_total": round(revenu_total, 2),
        "total_paiements": round(paiements_total, 2),
        "charges_total": round(charges_total, 2),
        "benefice": round(benefice, 2),
        "net_tresorerie": round(net_tresorerie, 2),
        "nb_factures": int(nb_factures),
        "factures_en_attente": int(factures_en_attente),
        "factures_payees": int(factures_payees),
        "monthly_overview": monthly_overview,
        "charges_by_type": charges_by_type,
        "factures_by_status": factures_by_status,
        "agence_compte_solde": round(agence_compte_solde, 2),
        "agence_compte_nom": agence_compte_nom,
        "total_comptes_solde": round(total_comptes_solde, 2),
        "agence_finance_stats": agence_finance_stats,
        "generated_at": datetime.utcnow().isoformat(),
    }
