# Fleet Service

Service backend FastAPI pour la gestion de flotte (vehicules et entretien).

## Structure du dossier

- `main.py` : application FastAPI, inclusion des routes et CORS
- `controllers/` : definition des endpoints `vehicles` et `entretiens`
- `models/` : modeles SQLAlchemy `Vehicle` et `VehicleEntretien`
- `schemas/` : schemas Pydantic pour validation request/response
- `services/` : logique metier CRUD
- `db.py` : configuration base de donnees SQLite/Postgres et creation des tables
- `config.py` : lecture des variables d'environnement `DATABASE_URL`

## Lancer le service

1. Creer un environnement virtuel :
```bash
python -m venv .venv
.venv\Scripts\activate
```

2. Installer les dependances :
```bash
pip install -r requirements.txt
```

3. Configurer `.env` si besoin :
```ini
DATABASE_URL=sqlite:///./fleet.db
```

4. Lancer le serveur :
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

5. Verifier l'API :
- `GET http://localhost:8000/`
- `GET http://localhost:8000/docs`

## Routes principales

- `GET /vehicles`
- `POST /vehicles`
- `GET /vehicles/{vehicle_id}`
- `PUT /vehicles/{vehicle_id}`
- `DELETE /vehicles/{vehicle_id}`
- `POST /vehicles/{vehicle_id}/entretiens`
- `GET /vehicles/{vehicle_id}/entretiens`
- `GET /entretiens/{entretien_id}`
- `PUT /entretiens/{entretien_id}`
- `DELETE /entretiens/{entretien_id}`
