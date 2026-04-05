# Auth Service - ERP Location de Voitures

## 1) Presentation

Le `Auth Service` est le microservice responsable de:

- l'authentification (login + JWT)
- la gestion des utilisateurs
- la gestion des roles (`employe`, `admin`, `super_admin`)
- la securisation des routes via Bearer token

Il fonctionne avec FastAPI + SQLAlchemy + PostgreSQL.

---

## 2) Stack technique

| Technologie | Usage |
| --- | --- |
| FastAPI | API REST |
| SQLAlchemy | ORM |
| PostgreSQL | Base de donnees |
| python-jose | JWT |
| passlib (bcrypt) | Hash mots de passe |
| Pydantic | Validation des schemas |
| pytest | Tests automatises |

---

## 3) Structure projet

```text
Auth-service/
|- config/
|- Controller/
|- dependencies/
|- Model/
|- Routes/
|- Schemas/
|- tests/
|- main.py
|- requirements.txt
`- README.md
```

---

## 4) Roles et regles metier

### Roles disponibles

- `employe`
- `admin`
- `super_admin`

### Regles principales

1. `super_admin` est unique dans l'application (un seul compte actif).
2. `admin` peut creer uniquement des `employe` dans sa propre agence.
3. `admin` peut gerer uniquement les employes de sa propre agence.
4. `admin` ne peut pas creer/modifier des admins.
5. `super_admin` peut creer des `admin` et `employe` (toutes agences).
6. `super_admin` peut gerer `admin` + `employe` via routes utilisateurs.
7. `super_admin` ne peut pas attribuer le role `super_admin` depuis `PUT /api/utilisateurs/{id}`.

---

## 5) Variables d'environnement

Exemple `.env`:

```env
DATABASE_URL=postgresql://erp_user:erp_password@postgres_db:5432/auth_db
SECRET_KEY=super_secret_key_123456
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=24
REFRESH_TOKEN_EXPIRE_DAYS=7
ENV=docker
```

---

## 6) URL de base

En docker-compose actuel:

```text
http://localhost:8000
```

---

## 7) Auth & Authorization

### JWT

Routes protegees: `Authorization: Bearer <token>`

Erreurs typiques:

- `401 Invalid token`
- `401 User not found`
- `403 Admin or super admin access required`
- `403 Super admin access required`

### Guards utilises

- `get_current_user`: utilisateur authentifie
- `admin_or_super_admin_required`: admin ou super_admin
- `super_admin_required`: super_admin uniquement

---

## 8) Routes API

### 8.1 Auth routes

| Methode | Route | Acces | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Inscrire un utilisateur standard (`role=employe`) |
| `POST` | `/api/auth/login` | Public | Login + generation access/refresh token |
| `POST` | `/api/auth/refresh` | Public | Regenerer un access token |
| `POST` | `/api/auth/create-user` | Admin + Super Admin | Creer un user avec role explicite selon policy |
| `POST` | `/api/auth/reset-password` | Public | Reinitialiser mot de passe via email |

### 8.2 User routes

| Methode | Route | Acces | Description |
| --- | --- | --- | --- |
| `GET` | `/api/utilisateurs/profile` | Authentifie | Lire son profil |
| `PUT` | `/api/utilisateurs/profile` | Authentifie | Modifier son profil |
| `GET` | `/api/utilisateurs/` | Admin + Super Admin | Lister users selon scope role |
| `GET` | `/api/utilisateurs/{id}` | Admin + Super Admin | Detail user selon scope role |
| `PUT` | `/api/utilisateurs/{id}` | Admin + Super Admin | Modifier user selon scope role |
| `DELETE` | `/api/utilisateurs/{id}` | Admin + Super Admin | Soft delete user selon scope role |
| `PATCH` | `/api/utilisateurs/{id}/disable` | Admin + Super Admin | Desactiver user selon scope role |
| `PATCH` | `/api/utilisateurs/{id}/enable` | Admin + Super Admin | Activer user selon scope role |

---

## 9) Scope detaille par role (routes utilisateurs)

### Admin

- peut voir/gerer uniquement `employe` de sa propre agence
- ne peut pas gerer `admin`
- ne peut pas changer `role` ou `agence_id` d'un utilisateur

### Super Admin

- peut voir/gerer `admin` + `employe` sur toutes les agences
- peut changer `role` (admin/employe) et `agence_id`
- ne peut pas assigner `super_admin` via route update user

---

## 10) Exemples JSON

### Register

```json
{
  "nom": "Ahmed Benali",
  "email": "ahmed.benali@erp.com",
  "password": "StrongPass123!",
  "agence_id": 1
}
```

### Login

```json
{
  "email": "ahmed.benali@erp.com",
  "password": "StrongPass123!"
}
```

### Create user (super_admin -> admin)

```json
{
  "nom": "Sara Admin",
  "email": "sara.admin@erp.com",
  "password": "AdminPass123!",
  "role": "admin",
  "agence_id": 2,
  "actif": true
}
```

### Create user (admin -> employe meme agence)

```json
{
  "nom": "Employe Agence 1",
  "email": "employee.a1@erp.com",
  "password": "EmployeePass123!",
  "role": "employe",
  "agence_id": 1,
  "actif": true
}
```

### Update user (super_admin)

```json
{
  "nom": "User Updated",
  "email": "user.updated@erp.com",
  "role": "admin",
  "agence_id": 3,
  "actif": true
}
```

### Update my profile

```json
{
  "nom": "Ahmed Profile Update",
  "email": "ahmed.profile@erp.com"
}
```

---

## 11) Erreurs metier importantes

### Creation user

- `400 Email already exists`
- `400 Only one super admin is allowed`
- `403 Admin can only create employe users`
- `403 Admin can only create users in their own agence`

### Gestion user

- `403 Not enough permissions to manage this user`
- `403 Admin cannot change user role`
- `403 Admin cannot change user agence`
- `403 Cannot assign super admin role from this route`
- `404 User not found`

---

## 12) Lancement

### Local

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Docker (depuis `code/`)

```bash
docker compose up --build
```

---

## 13) Tests

Depuis `Auth-service`:

```bash
pytest -q
```

Exemples ciblage:

```bash
pytest -q tests/test_auth_extended.py
pytest -q tests/test_user_management.py
pytest -q tests/test_user_management_edge_cases.py
```

Ces tests couvrent notamment:

- policy admin vs super_admin
- scope par agence
- unicite super_admin
- protections routes de gestion

---

## 14) Swagger

Documentation interactive:

```text
http://localhost:8000/docs
```
