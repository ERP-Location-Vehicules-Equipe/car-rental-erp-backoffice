# Auth Service

Service FastAPI charge de l'authentification des utilisateurs:
- inscription (`register`)
- connexion (`login`)
- rafraichissement du token d'acces (`refresh`)

Le service expose ses routes sous le prefixe global `/api/auth`.

## 1. Stack et structure

- Framework API: FastAPI
- ORM: SQLAlchemy
- DB: PostgreSQL
- Hash mot de passe: Passlib + bcrypt
- JWT: python-jose

Fichiers principaux:
- `main.py`: creation app FastAPI, inclusion des routes, route health `/`
- `Routes/AuthRoute.py`: definition des endpoints REST
- `Controller/AuthController.py`: logique metier (hash, verif, generation JWT)
- `Schemas/AuthSchema.py`: validation des payloads entree
- `Model/User.py`: modele SQLAlchemy `users`
- `config/database.py`: connexion SQLAlchemy + session

## 2. Variables d'environnement

Fichier: `.env`

- `DATABASE_URL`: URL PostgreSQL
- `SECRET_KEY`: cle de signature JWT
- `ALGORITHM`: algo JWT (ex: `HS256`)
- `ACCESS_TOKEN_EXPIRE_HOURS`: duree token acces
- `REFRESH_TOKEN_EXPIRE_DAYS`: duree refresh token

Exemple:

```env
DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/erp_location_db
SECRET_KEY=super_secret_key_123456
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## 3. Lancement

### Local

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Docker Compose (depuis la racine `Backend_Server`)

```bash
docker compose up --build
```

Ports:
- auth service: `http://localhost:8000`
- postgres: `localhost:5432`
- pgadmin: `http://localhost:5050`

## 4. Modele de donnees (table `users`)

Colonnes:
- `id` (PK, int)
- `name` (string, obligatoire)
- `email` (string, unique, index)
- `password` (string hash)
- `role` (string, defaut `user`)
- `is_active` (bool, defaut `True`)

Au demarrage, les tables sont creees automatiquement via:
- `Base.metadata.create_all(bind=engine)`

## 5. Routes disponibles

Base URL locale: `http://localhost:8000`

### 5.1 Health check

- `GET /`
- Reponse:

```json
{
  "message": "Auth Service Running"
}
```

### 5.2 Register

- `POST /api/auth/register`
- Body JSON:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

Validation:
- `email` doit etre un email valide (Pydantic `EmailStr`)

Reponse succes:

```json
{
  "message": "User created",
  "user": "john@example.com"
}
```

### 5.3 Login

- `POST /api/auth/login`
- Body JSON:

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123!"
}
```

Reponse succes:

```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token"
}
```

Erreur credentials invalides:
- HTTP `401`

```json
{
  "detail": "Invalid credentials"
}
```

### 5.4 Refresh access token

- `POST /api/auth/refresh`
- Body JSON:

```json
{
  "refresh_token": "jwt_refresh_token"
}
```

Reponse succes:

```json
{
  "access_token": "new_jwt_access_token"
}
```

Erreur refresh token invalide/expire:
- HTTP `401`

```json
{
  "detail": "Invalid refresh token"
}
```

## 6. JWT: contenu des tokens

- Access token genere lors du login:
  - `user_id`
  - `email`
  - `exp`
- Refresh token:
  - `user_id`
  - `exp`
- Access token regenere via `/refresh`:
  - `user_id`
  - `exp`

Note:
- Le refresh token n'est pas stocke en base dans cette version.
- Il n'y a pas de mecanisme de revoke / blacklist.

## 7. Fichiers JSON de test

Dossier: `tests/json`

- `tests/json/register_valid.json`
- `tests/json/register_invalid_email.json`
- `tests/json/login_valid.json`
- `tests/json/login_invalid_password.json`
- `tests/json/refresh_valid_template.json`
- `tests/json/refresh_invalid.json`

### Utilisation rapide avec cURL

Register:

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  --data @tests/json/register_valid.json
```

Login:

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  --data @tests/json/login_valid.json
```

Refresh:

```bash
curl -X POST "http://localhost:8000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  --data @tests/json/refresh_valid_template.json
```

## 8. Documentation auto FastAPI

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
