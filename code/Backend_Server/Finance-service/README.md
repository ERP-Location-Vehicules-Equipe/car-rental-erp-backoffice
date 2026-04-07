# Finance Service

Service backend de gestion financiere pour l'ERP de location de voitures.

Ce microservice gere:
- les factures
- les paiements
- les comptes de tresorerie
- les charges
- le rapport financier global

Base URL:

```text
http://localhost:8001/api
```

## Authentification

Le service utilise JWT via `Authorization: Bearer <token>`.

Roles utilises dans les routes:
- `get_current_user`: lecture autorisee pour utilisateur connecte
- `employee_required`: employe ou admin
- `admin_required`: admin seulement

## Endpoints systeme

### `GET /`

Description: verifie que le service tourne.

Response:

```json
{
  "service": "Finance Service",
  "status": "running"
}
```

### `GET /health`

Description: health check rapide.

Response:

```json
{
  "status": "ok"
}
```

## Factures

Prefix:

```text
/api/factures
```

Description:
- cree une facture pour une location
- calcule `montant_ttc` automatiquement
- gere soft delete et restore
- le statut par defaut est `en_attente`

### `POST /api/factures/`

Role: `employee_required`

Description: creer une nouvelle facture.

Request JSON:

```json
{
  "location_id": 1,
  "montant_ht": 5000,
  "tva": 20
}
```

Response JSON:

```json
{
  "id": 1,
  "location_id": 1,
  "numero": "1",
  "montant_ht": 5000,
  "tva": 20,
  "montant_ttc": 6000,
  "date_emission": "2026-04-05T10:30:00",
  "statut": "en_attente"
}
```

### `GET /api/factures/`

Role: `get_current_user`

Description: lister toutes les factures non supprimees.

Response JSON:

```json
{
  "factures": [
    {
      "id": 1,
      "location_id": 1,
      "numero": "1",
      "montant_ht": 5000,
      "tva": 20,
      "montant_ttc": 6000,
      "date_emission": "2026-04-05T10:30:00",
      "statut": "en_attente"
    }
  ]
}
```

### `GET /api/factures/deleted`

Role: `admin_required`

Description: lister les factures supprimees en soft delete.

Response JSON:

```json
{
  "factures": [
    {
      "id": 3,
      "location_id": 8,
      "numero": "3",
      "montant_ht": 3000,
      "tva": 20,
      "montant_ttc": 3600,
      "date_emission": "2026-04-01T09:00:00",
      "statut": "en_attente"
    }
  ]
}
```

### `GET /api/factures/{facture_id}`

Role: `get_current_user`

Description: recuperer une facture par son id.

Response JSON:

```json
{
  "id": 1,
  "location_id": 1,
  "numero": "1",
  "montant_ht": 5000,
  "tva": 20,
  "montant_ttc": 6000,
  "date_emission": "2026-04-05T10:30:00",
  "statut": "en_attente"
}
```

### `PUT /api/factures/{facture_id}`

Role: `employee_required`

Description: modifier le statut, le montant HT ou la TVA d'une facture.

Request JSON:

```json
{
  "statut": "payee",
  "montant_ht": 5500,
  "tva": 20
}
```

Response JSON:

```json
{
  "id": 1,
  "location_id": 1,
  "numero": "1",
  "montant_ht": 5500,
  "tva": 20,
  "montant_ttc": 6600,
  "date_emission": "2026-04-05T10:30:00",
  "statut": "payee"
}
```

### `PATCH /api/factures/{facture_id}/restore`

Role: `admin_required`

Description: restaurer une facture supprimee.

Response JSON:

```json
{
  "message": "Facture restored successfully"
}
```

### `DELETE /api/factures/{facture_id}`

Role: `admin_required`

Description: supprimer une facture en soft delete.

Response JSON:

```json
{
  "message": "Facture deleted successfully"
}
```

## Paiements

Prefix:

```text
/api/paiements
```

Description:
- enregistre un paiement sur une facture
- met a jour le `solde_actuel` du compte si `compte_id` existe
- met a jour le statut de la facture en `payee` si le total paye couvre `montant_ttc`

### `POST /api/paiements/`

Role: `employee_required`

Description: creer un paiement.

Request JSON:

```json
{
  "facture_id": 1,
  "compte_id": 1,
  "montant": 1200,
  "mode": "virement",
  "reference": "VIR-001"
}
```

Response JSON:

```json
{
  "id": 1,
  "facture_id": 1,
  "compte_id": 1,
  "montant": 1200,
  "mode": "virement",
  "date_paiement": "2026-04-05T11:00:00",
  "reference": "VIR-001"
}
```

### `GET /api/paiements/`

Role: `get_current_user`

Description: lister tous les paiements non supprimes.

Response JSON:

```json
{
  "paiements": [
    {
      "id": 1,
      "facture_id": 1,
      "compte_id": 1,
      "montant": 1200,
      "mode": "virement",
      "date_paiement": "2026-04-05T11:00:00",
      "reference": "VIR-001"
    }
  ]
}
```

### `GET /api/paiements/facture/{facture_id}`

Role: `get_current_user`

Description: recuperer tous les paiements d'une facture.

Response JSON:

```json
{
  "paiements": [
    {
      "id": 1,
      "facture_id": 1,
      "compte_id": 1,
      "montant": 1200,
      "mode": "virement",
      "date_paiement": "2026-04-05T11:00:00",
      "reference": "VIR-001"
    }
  ]
}
```

### `GET /api/paiements/{paiement_id}`

Role: `get_current_user`

Description: recuperer un paiement par id.

Response JSON:

```json
{
  "id": 1,
  "facture_id": 1,
  "compte_id": 1,
  "montant": 1200,
  "mode": "virement",
  "date_paiement": "2026-04-05T11:00:00",
  "reference": "VIR-001"
}
```

### `DELETE /api/paiements/{paiement_id}`

Role: `admin_required`

Description: supprimer un paiement en soft delete.

Response JSON:

```json
{
  "message": "Paiement deleted successfully"
}
```

## Comptes de tresorerie

Prefix:

```text
/api/comptes
```

Description:
- gere les comptes financiers du systeme
- types supportes dans le schema: `banque` et `caisse`

### `POST /api/comptes/`

Role: `employee_required`

Description: creer un compte de tresorerie.

Request JSON:

```json
{
  "nom": "Compte principal",
  "type": "banque",
  "solde_actuel": 50000
}
```

Response JSON:

```json
{
  "id": 1,
  "nom": "Compte principal",
  "type": "banque",
  "solde_actuel": 50000
}
```

### `GET /api/comptes/`

Role: `get_current_user`

Description: lister les comptes non supprimes.

Response JSON:

```json
{
  "comptes": [
    {
      "id": 1,
      "nom": "Compte principal",
      "type": "banque",
      "solde_actuel": 50000
    }
  ]
}
```

### `GET /api/comptes/{compte_id}`

Role: `get_current_user`

Description: recuperer un compte par id.

Response JSON:

```json
{
  "id": 1,
  "nom": "Compte principal",
  "type": "banque",
  "solde_actuel": 50000
}
```

### `PUT /api/comptes/{compte_id}`

Role: `employee_required`

Description: modifier le nom ou le solde du compte.

Request JSON:

```json
{
  "nom": "Compte secondaire",
  "solde_actuel": 42000
}
```

Response JSON:

```json
{
  "id": 1,
  "nom": "Compte secondaire",
  "type": "banque",
  "solde_actuel": 42000
}
```

### `DELETE /api/comptes/{compte_id}`

Role: `admin_required`

Description: supprimer un compte en soft delete.

Response JSON:

```json
{
  "message": "Compte deleted successfully"
}
```

## Charges

Prefix:

```text
/api/charges
```

Description:
- enregistre les depenses liees aux vehicules ou a l'activite
- `date_charge` est automatique si elle n'est pas envoyee

### `POST /api/charges/`

Role: `employee_required`

Description: creer une charge.

Request JSON:

```json
{
  "type": "carburant",
  "vehicule_id": 1,
  "agence_id": 2,
  "categorie_charge": "exploitation",
  "montant": 350,
  "date_charge": "2026-04-05T12:00:00",
  "description": "Plein carburant"
}
```

Response JSON:

```json
{
  "id": 1,
  "type": "carburant",
  "vehicule_id": 1,
  "agence_id": null,
  "categorie_charge": "exploitation",
  "montant": 350,
  "date_charge": "2026-04-05T12:00:00",
  "description": "Plein carburant"
}
```

Note:
- le schema accepte `agence_id`
- mais le controller `create_charge` n'enregistre pas actuellement `agence_id`, donc la reponse reste `null`

### `GET /api/charges/`

Role: `get_current_user`

Description: lister toutes les charges non supprimees.

Response JSON:

```json
{
  "charges": [
    {
      "id": 1,
      "type": "carburant",
      "vehicule_id": 1,
      "agence_id": null,
      "categorie_charge": "exploitation",
      "montant": 350,
      "date_charge": "2026-04-05T12:00:00",
      "description": "Plein carburant"
    }
  ]
}
```

### `GET /api/charges/vehicule/{vehicule_id}`

Role: `get_current_user`

Description: recuperer les charges d'un vehicule.

Response JSON:

```json
{
  "charges": [
    {
      "id": 1,
      "type": "carburant",
      "vehicule_id": 1,
      "agence_id": null,
      "categorie_charge": "exploitation",
      "montant": 350,
      "date_charge": "2026-04-05T12:00:00",
      "description": "Plein carburant"
    }
  ]
}
```

### `GET /api/charges/{charge_id}`

Role: `get_current_user`

Description: recuperer une charge par id.

Response JSON:

```json
{
  "id": 1,
  "type": "carburant",
  "vehicule_id": 1,
  "agence_id": null,
  "categorie_charge": "exploitation",
  "montant": 350,
  "date_charge": "2026-04-05T12:00:00",
  "description": "Plein carburant"
}
```

### `PUT /api/charges/{charge_id}`

Role: `employee_required`

Description: modifier type, montant, categorie ou description.

Request JSON:

```json
{
  "type": "entretien",
  "montant": 480,
  "categorie_charge": "maintenance",
  "description": "Vidange + filtre"
}
```

Response JSON:

```json
{
  "id": 1,
  "type": "entretien",
  "vehicule_id": 1,
  "agence_id": null,
  "categorie_charge": "maintenance",
  "montant": 480,
  "date_charge": "2026-04-05T12:00:00",
  "description": "Vidange + filtre"
}
```

### `DELETE /api/charges/{charge_id}`

Role: `admin_required`

Description: supprimer une charge en soft delete.

Response JSON:

```json
{
  "message": "Charge deleted successfully"
}
```

## Rapport financier

Prefix:

```text
/api/rapport
```

Description:
- retourne un resume global du module financier
- calcule les montants a partir des factures, paiements et charges non supprimes
- `solde_net = total_paiements - total_charges`

### `GET /api/rapport/`

Role: `get_current_user`

Description: recuperer le rapport financier global.

Response JSON:

```json
{
  "total_factures": 6000,
  "total_paiements": 1200,
  "total_charges": 350,
  "solde_net": 850,
  "factures_en_attente": 1,
  "factures_payees": 0
}
```

## Route presente dans le code mais non montee

Fichier:

```text
Routes/DashboardRoutes.py
```

Route definie:

```text
GET /dashboard/stats
```

Mais elle n'est pas incluse dans `Routes/index.py`, donc actuellement elle n'est pas accessible via l'application.

## Lancer le service

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Swagger:

```text
http://localhost:8001/docs
```

## Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@localhost:5432/finance_db
SECRET_KEY=your_shared_secret
ALGORITHM=HS256
```
