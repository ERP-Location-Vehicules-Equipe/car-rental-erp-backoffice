# Auth Service - ERP Location de Voitures

## 1. Presentation du service

Le `Auth Service` est le microservice responsable de l'identite et de la securite dans l'architecture ERP de location de voitures.

Son role est central: il permet de gerer l'acces aux autres microservices en emettant et validant des tokens JWT.

Ce service prend en charge:

- l'authentification des utilisateurs
- la gestion des utilisateurs
- la gestion des roles
- la creation et le renouvellement des tokens JWT
- la protection des routes securisees

## 2. Technologies utilisees

| Technologie | Role |
| --- | --- |
| FastAPI | Framework API REST |
| PostgreSQL | Base de donnees relationnelle |
| SQLAlchemy | ORM pour l'acces aux donnees |
| JWT (python-jose) | Authentification stateless par token |
| Docker | Conteneurisation du service |
| Pydantic | Validation des schemas d'entree/sortie |
| Uvicorn | Serveur ASGI pour executer FastAPI |

## 3. Architecture du projet

```text
Auth-service
|
|- config
|- Controller
|- dependencies
|- Model
|- Routes
|- Schemas
|- main.py
|- Dockerfile
`- docker-compose.yml
```

Description des dossiers/fichiers:

| Element | Description |
| --- | --- |
| `config/` | Configuration base de donnees (`engine`, `SessionLocal`, `Base`) |
| `Controller/` | Logique metier (authentification, utilisateurs, reset password, soft delete) |
| `dependencies/` | Fonctions de securite (hash password, JWT, guards auth/role) |
| `Model/` | Modeles SQLAlchemy |
| `Routes/` | Endpoints API (`/auth`, `/utilisateurs`) |
| `Schemas/` | Schemas Pydantic de validation |
| `main.py` | Point d'entree FastAPI |
| `Dockerfile` | Build de l'image Docker du service |
| `docker-compose.yml` | Orchestration Docker (dans ce repo, situe a la racine `Backend_Server`) |

## 4. Description des fonctionnalites

Fonctionnalites implementees:

- `Register`
- `Login`
- `JWT Access Token`
- `Refresh Token`
- `Reset Password`
- `User Management`
- `Role Authorization`
- `Soft Delete`
- `Enable / Disable User`

## 5. Documentation complete de l'API

Base URL locale:

```text
http://localhost:8000
```

### AUTH ROUTES

#### POST `/api/auth/register`

- Methode HTTP: `POST`
- Endpoint: `/api/auth/register`
- Description: inscrire un utilisateur standard

Request JSON example:

```json
{
  "nom": "Ahmed Benali",
  "email": "ahmed.benali@erp.com",
  "password": "StrongPass123!",
  "agence_id": 1
}
```

Response JSON example (200):

```json
{
  "message": "User created",
  "user": "ahmed.benali@erp.com"
}
```

#### POST `/api/auth/login`

- Methode HTTP: `POST`
- Endpoint: `/api/auth/login`
- Description: authentifier un utilisateur et retourner les tokens JWT

Request JSON example:

```json
{
  "email": "ahmed.benali@erp.com",
  "password": "StrongPass123!"
}
```

Response JSON example (200):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
}
```

Response JSON example (401):

```json
{
  "detail": "Invalid credentials"
}
```

#### POST `/api/auth/refresh`

- Methode HTTP: `POST`
- Endpoint: `/api/auth/refresh`
- Description: generer un nouvel access token a partir d'un refresh token

Request JSON example:

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
}
```

Response JSON example (200):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
}
```

Response JSON example (401):

```json
{
  "detail": "Invalid refresh token"
}
```

#### POST `/api/auth/create-user`

- Methode HTTP: `POST`
- Endpoint: `/api/auth/create-user`
- Description: creer un utilisateur avec role explicite

Request JSON example:

```json
{
  "nom": "Sara Admin",
  "email": "sara.admin@erp.com",
  "password": "AdminPass123!",
  "role": "admin",
  "agence_id": 1,
  "actif": true
}
```

Response JSON example (200):

```json
{
  "message": "User created successfully",
  "user_id": 12,
  "email": "sara.admin@erp.com",
  "role": "admin"
}
```

#### POST `/api/auth/reset-password`

- Methode HTTP: `POST`
- Endpoint: `/api/auth/reset-password`
- Description: reinitialiser le mot de passe d'un utilisateur via email

Request JSON example:

```json
{
  "email": "ahmed.benali@erp.com",
  "new_password": "NewStrongPass456!"
}
```

Response JSON example (200):

```json
{
  "message": "Password updated successfully"
}
```

Response JSON example (404):

```json
{
  "detail": "User not found"
}
```

### USER MANAGEMENT

#### GET `/api/utilisateurs/profile`

- Methode HTTP: `GET`
- Endpoint: `/api/utilisateurs/profile`
- Description: recuperer le profil de l'utilisateur connecte
- Securite: token `Bearer` requis

Request JSON example:

```json
{}
```

Response JSON example (200):

```json
{
  "id": 1,
  "nom": "Ahmed Benali",
  "email": "ahmed.benali@erp.com",
  "role": "employe",
  "agence_id": 1,
  "actif": true
}
```

#### GET `/api/utilisateurs`

- Methode HTTP: `GET`
- Endpoint: `/api/utilisateurs`
- Description: lister les utilisateurs actifs (non soft-delete)
- Securite: acces admin requis

Request JSON example:

```json
{}
```

Response JSON example (200):

```json
[
  {
    "id": 1,
    "nom": "Ahmed Benali",
    "email": "ahmed.benali@erp.com",
    "role": "employe",
    "agence_id": 1,
    "actif": true
  },
  {
    "id": 2,
    "nom": "Sara Admin",
    "email": "sara.admin@erp.com",
    "role": "admin",
    "agence_id": 1,
    "actif": true
  }
]
```

#### GET `/api/utilisateurs/{id}`

- Methode HTTP: `GET`
- Endpoint: `/api/utilisateurs/{id}`
- Description: recuperer un utilisateur par ID
- Securite: acces admin requis

Request JSON example:

```json
{
  "id": 2
}
```

Response JSON example (200):

```json
{
  "id": 2,
  "nom": "Sara Admin",
  "email": "sara.admin@erp.com",
  "role": "admin",
  "agence_id": 1,
  "actif": true
}
```

#### PUT `/api/utilisateurs/{id}`

- Methode HTTP: `PUT`
- Endpoint: `/api/utilisateurs/{id}`
- Description: mettre a jour un utilisateur
- Securite: acces admin requis

Request JSON example:

```json
{
  "nom": "Ahmed Benali Updated",
  "email": "ahmed.updated@erp.com",
  "role": "employe",
  "agence_id": 2,
  "actif": true
}
```

Response JSON example (200):

```json
{
  "id": 1,
  "nom": "Ahmed Benali Updated",
  "email": "ahmed.updated@erp.com",
  "role": "employe",
  "agence_id": 2,
  "actif": true
}
```

#### DELETE `/api/utilisateurs/{id}`

- Methode HTTP: `DELETE`
- Endpoint: `/api/utilisateurs/{id}`
- Description: soft delete d'un utilisateur
- Securite: acces admin requis

Request JSON example:

```json
{
  "id": 3
}
```

Response JSON example (200):

```json
{
  "message": "User deleted successfully"
}
```

#### PATCH `/api/utilisateurs/{id}/disable`

- Methode HTTP: `PATCH`
- Endpoint: `/api/utilisateurs/{id}/disable`
- Description: desactiver un utilisateur
- Securite: acces admin requis

Request JSON example:

```json
{
  "id": 4
}
```

Response JSON example (200):

```json
{
  "id": 4,
  "nom": "Utilisateur Test",
  "email": "test.user@erp.com",
  "role": "employe",
  "agence_id": 1,
  "actif": false
}
```

#### PATCH `/api/utilisateurs/{id}/enable`

- Methode HTTP: `PATCH`
- Endpoint: `/api/utilisateurs/{id}/enable`
- Description: activer un utilisateur
- Securite: acces admin requis

Request JSON example:

```json
{
  "id": 4
}
```

Response JSON example (200):

```json
{
  "id": 4,
  "nom": "Utilisateur Test",
  "email": "test.user@erp.com",
  "role": "employe",
  "agence_id": 1,
  "actif": true
}
```

## 6. JSON examples pour tester l'API

### Register

```json
{
  "nom": "Yassine Ait",
  "email": "yassine.ait@erp.com",
  "password": "Password123!",
  "agence_id": 1
}
```

### Login

```json
{
  "email": "yassine.ait@erp.com",
  "password": "Password123!"
}
```

### Refresh token

```json
{
  "refresh_token": "VOTRE_REFRESH_TOKEN"
}
```

### Create user

```json
{
  "nom": "Nadia Manager",
  "email": "nadia.manager@erp.com",
  "password": "ManagerPass123!",
  "role": "admin",
  "agence_id": 2,
  "actif": true
}
```

### Reset password

```json
{
  "email": "nadia.manager@erp.com",
  "new_password": "NewManagerPass456!"
}
```

### Update user

```json
{
  "nom": "Nadia Manager Updated",
  "email": "nadia.updated@erp.com",
  "role": "admin",
  "agence_id": 3,
  "actif": true
}
```

## 7. Headers pour les routes securisees

Pour les routes protegees, utiliser:

```http
Authorization: Bearer TOKEN
```

Exemple:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
```

## 8. Comment lancer le service

### Option 1 - Docker

Depuis la racine `Backend_Server`:

```bash
docker compose up --build
```

### Option 2 - Local (Uvicorn)

Depuis `Auth-service`:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Service accessible sur:

```text
http://localhost:8000
```

## 9. Test avec Swagger

Swagger UI est disponible sur:

```text
/docs
```

URL complete en local:

```text
http://localhost:8000/docs
```

## 10. Tests automatises (pytest)

Le projet contient une suite de tests automatises dans le dossier `tests/`.
Elle couvre les routes `AUTH` et `USER MANAGEMENT` avec des cas de succes et des cas d'erreur.

### 10.1 Structure des tests

```text
tests/
|- conftest.py
|- test_auth_register.py
|- test_auth_login.py
|- test_auth_refresh.py
|- test_auth_reset_password.py
|- test_user_profile.py
|- test_user_management.py
`- json/
```

### 10.2 Role de chaque fichier

| Fichier | Ce qu'il teste |
| --- | --- |
| `tests/conftest.py` | Configuration globale pytest: base de test SQLite, `TestClient`, fixtures utilisateurs, fixtures tokens JWT, loader de payloads JSON |
| `tests/test_auth_register.py` | `POST /api/auth/register` et `POST /api/auth/create-user` (succes + erreurs de validation) |
| `tests/test_auth_login.py` | `POST /api/auth/login` (succes, mot de passe invalide, utilisateur introuvable) |
| `tests/test_auth_refresh.py` | `POST /api/auth/refresh` (refresh token valide / invalide) |
| `tests/test_auth_reset_password.py` | `POST /api/auth/reset-password` (succes + utilisateur introuvable) et verification du login apres reset |
| `tests/test_user_profile.py` | `GET /api/utilisateurs/profile` (avec token, sans token, token invalide) |
| `tests/test_user_management.py` | routes admin: list users, get by id, update, disable, enable, soft delete, controle d'acces non-admin |
| `tests/json/*.json` | payloads de test reutilisables pour les requetes API |

### 10.3 Comment lancer les tests

Depuis la racine `Backend_Server` (comme dans ton terminal):

```bash
pytest -q Auth-service/tests
```

Depuis le dossier `Auth-service`:

```bash
pytest -q
```

Lancer un seul fichier:

```bash
pytest -q tests/test_auth_login.py
```

Lancer un seul test:

```bash
pytest -q tests/test_auth_login.py::test_login_user_success
```

### 10.4 Resultat attendu

Si tout est correct, tu dois voir un resume comme:

```text
21 passed
```

Des `warnings` peuvent apparaitre, mais tant que tu n'as pas de `FAILED`, la suite de tests est valide.

## 11. Conclusion

Le `Auth Service` est un composant cle du systeme ERP.
Il centralise l'authentification, les roles et la securite des acces.

Il peut etre integre directement avec:

- Agence Service
- Fleet Service
- Location Service
- Notification Service

Cette approche facilite la construction d'une architecture microservices robuste, securisee et evolutive.
