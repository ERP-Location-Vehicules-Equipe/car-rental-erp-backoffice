# Fleet Service

Service backend FastAPI pour la gestion de flotte (véhicules et maintenance).

## Structure du dossier

- `main.py` : application FastAPI + inclusion des routes + CORS
- `controllers/` : définition des endpoints (vehicles, maintenance)
- `models/` : modèles SQLAlchemy (`Vehicle`, `VehicleMaintenance`)
- `schemas/` : schémas Pydantic pour validation request/response
- `services/` : logique métier CRUD (get_all, create, update, delete, etc.)
- `db.py` : configuration base de données SQLite/Postgres et création de tables
- `config.py` : lecture des variables d'environnement (DATABASE_URL)

## Prérequis

- Python 3.10+
- dependencies listées dans `requirements.txt` :
  - fastapi
  - uvicorn
  - sqlalchemy
  - pydantic
  - python-dotenv
  - etc.

## Lancer le service (local)

1. Crée un environnement virtuel :
   ```bash
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate # Linux/macOS
   ```

2. Installe les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

3. (Optionnel) Crée `.env` et configure :
   ```ini
   DATABASE_URL=sqlite:///./fleet.db
   # ou postgresql://user:pass@host:port/dbname
   ```

4. Lancer le serveur :
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

5. Tester l'API :
   - `GET http://localhost:8000/` doit répondre `{ "message": "Fleet Service running 🚀" }`
   - docs OpenAPI : `http://localhost:8000/docs`

## Points importants

- `main.py` contient middleware CORS autorisant le front React sur `http://localhost:5173`.
- Les routes des véhicules sont sous `/vehicles` (GET, POST, PUT, DELETE).
- Les routes maintenance sont sous `/maintenance`.

## CRUD véhicules (exemple)

- list: `GET /vehicles`
- item: `GET /vehicles/{vehicle_id}`
- create: `POST /vehicles`
- update: `PUT /vehicles/{vehicle_id}`
- delete: `DELETE /vehicles/{vehicle_id}`

## Débogage

- Vérifier que le service fonctionne : `curl -i http://localhost:8000/`
- Si CORS bloque, vérifier `main.py` et `allow_origins`
- Consulter les logs de `uvicorn` pour voir les erreurs SQL ou d'endpoint

## Intégration avec frontend

- Les appels frontend doivent pointer vers `http://localhost:8000` (pas 8001).
- Exemple d'appel `vehicle` :
  - `GET http://localhost:8000/vehicles`
  - `POST http://localhost:8000/vehicles` avec JSON `{"make":"Renault","model":"Clio","year":2020,"plate":"AA123BB"}`

---

Ce README couvre toute la base pour déployer et utiliser `fleet-service`.
