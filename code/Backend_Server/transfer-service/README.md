# Transfer Service API (transferts)

Base URL (dev): `http://127.0.0.1:8000`

All endpoints are prefixed with `/transferts`. JSON only. Authentication uses the `Authorization: Bearer <token>` header if your deployment enables it.

## Status values
- `PENDING`
- `IN_TRANSIT`
- `COMPLETED`
- `CANCELLED`

## Data model
`TransferResponse` returned by the API:
```json
{
  "id": 1,
  "vehicule_id": 12,
  "agence_source_id": 3,
  "agence_destination_id": 5,
  "etat": "PENDING",
  "date_depart": "2026-04-05",
  "date_arrivee_prevue": "2026-04-06",
  "date_arrivee_reelle": "2026-04-07",
  "reason": "Maintenance",
  "notes": "Optional note",
  "created_by": "alice",
  "created_at": "2026-04-05T10:00:00Z",
  "updated_at": "2026-04-05T10:00:00Z"
}
```

## Routes

### 1) Creer un transfert
- **POST** `/transferts/`
- Body:
```json
{
  "vehicule_id": 12,
  "agence_source_id": 3,
  "agence_destination_id": 5,
  "date_depart": "2026-04-05",
  "reason": "Maintenance",
  "notes": "Optional note",
  "created_by": "alice"
}
```
- Reponses: `200` avec `TransferResponse`. Erreurs: `400` si agence source = destination ou vehicule deja en transfert actif.

### 2) Lister les transferts
- **GET** `/transferts/`
- Reponse: `200` liste de `TransferResponse`.

### 3) Recuperer un transfert par id
- **GET** `/transferts/{transfer_id}`
- Reponse: `200` `TransferResponse`; `404` si non trouve.

### 4) Lister par vehicule
- **GET** `/transferts/vehicule/{vehicule_id}`
- Reponse: `200` liste de `TransferResponse`.

### 5) Mettre a jour l etat
- **PUT** `/transferts/{transfer_id}/status`
- Body:
```json
{
  "etat": "IN_TRANSIT",
  "notes": "Optionnel"
}
```
- Effets metier:
  - `IN_TRANSIT` renseigne `date_arrivee_prevue` a la date du jour.
  - `COMPLETED` renseigne `date_arrivee_reelle` a la date du jour.
  - `CANCELLED` ou `COMPLETED` ne peuvent plus etre modifies.

### 6) Annuler un transfert
- **PUT** `/transferts/{transfer_id}/cancel`
- Reponse: `200` `TransferResponse` avec `etat` = `CANCELLED`; `400` si deja complete.

## Notes base de donnees
- Table: `transferts`
- Colonnes principales: `vehicule_id`, `agence_source_id`, `agence_destination_id`, `date_depart`, `date_arrivee_prevue`, `date_arrivee_reelle`, `etat`, `reason`, `notes`, `created_by`, timestamps.

## Exemples curl rapides
```bash
# Creation
curl -X POST http://127.0.0.1:8000/transferts/ ^
  -H "Content-Type: application/json" ^
  -d "{\"vehicule_id\":12,\"agence_source_id\":3,\"agence_destination_id\":5,\"date_depart\":\"2026-04-05\",\"reason\":\"Maintenance\",\"created_by\":\"alice\"}"

# Liste
curl http://127.0.0.1:8000/transferts/

# Mise a jour etat
curl -X PUT http://127.0.0.1:8000/transferts/1/status ^
  -H "Content-Type: application/json" ^
  -d "{\"etat\":\"IN_TRANSIT\",\"notes\":\"Depart confirme\"}"

# Annulation
curl -X PUT http://127.0.0.1:8000/transferts/1/cancel
```
