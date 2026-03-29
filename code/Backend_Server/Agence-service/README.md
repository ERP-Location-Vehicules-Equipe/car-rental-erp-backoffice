# Agence Service - Documentation complete (FR)

Ce microservice gere les agences du reseau (creation, lecture, mise a jour, statut actif/inactif, suppression logique) avec controle JWT et role super admin pour les operations critiques.

## 1) Stack et structure

- Runtime: Node.js (ES Modules)
- Framework API: Express
- Base de donnees: PostgreSQL
- ORM: Sequelize
- Auth: JWT (`Authorization: Bearer <token>`)
- Tests: Jest + Supertest

Structure principale:

```text
Agence-service/
|- src/
|  |- app.js
|  |- config/
|  |  |- db.js
|  |  `- initDB.js
|  |- controllers/
|  |  `- agenceController.js
|  |- middlewares/
|  |  |- authMiddleware.js
|  |  |- roleMiddleware.js
|  |  `- errorMiddleware.js
|  |- models/
|  |  `- agenceModel.js
|  `- routes/
|     `- agenceRoutes.js
|- tests/
|  |- agence.test.js
|  |- agence.integration.test.js
|  `- json/
|- server.js
|- package.json
`- Dockerfile
```

## 2) Variables d'environnement

Utilise un fichier `.env` (ou cree un `.env` depuis `.env.example`).

Variables principales:

- `PORT`: port HTTP du service
- `DATABASE_URL`: URL PostgreSQL principale
- `SECRET_KEY`: secret JWT pour verifier les tokens
- `INTEGRATION_DATABASE_URL` (optionnel): URL DB dediee aux tests d'integration
- `TEST_SECRET_KEY` (optionnel): secret JWT dedie aux tests d'integration

Exemple:

```env
PORT=8002
DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/agence_db
SECRET_KEY=change_me
INTEGRATION_DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/agence_test_db
TEST_SECRET_KEY=integration_test_secret
```

## 3) Lancer le service

Installation:

```bash
npm install
```

Demarrage:

```bash
npm run dev
# ou
npm start
```

Au demarrage, le service:

1. essaie de creer la base (si absente),
2. teste la connexion PostgreSQL,
3. synchronise les tables Sequelize (`sync({ alter: true })`),
4. expose l'API.

## 4) Docker

Build:

```bash
docker build -t agence-service .
```

Run (exemple):

```bash
docker run --rm -p 8002:8002 --env-file .env agence-service
```

## 5) Auth et autorisation

### JWT obligatoire

Toutes les routes utilisent `verifyToken`.

- Si header absent: `401 { "message": "No token provided" }`
- Si token invalide/expire: `401 { "message": "Invalid or expired token" }`

### Role super admin

Les routes d'ecriture et d'historique utilisent `isSuperAdmin`.

- Si role different de `super_admin`: `403 { "message": "Access denied (super admin only)" }`

## 6) Modele Agence (table `agences`)

Champs:

- `id` (integer, PK, auto increment)
- `nom` (string, obligatoire)
- `code` (string, obligatoire, unique)
- `ville` (string, obligatoire)
- `adresse` (string, optionnel)
- `telephone` (string, optionnel)
- `email` (string, optionnel, unique, format email valide)
- `responsable_nom` (string, optionnel)
- `heure_ouverture` (string, optionnel)
- `heure_fermeture` (string, optionnel)
- `capacite_max_vehicules` (integer, optionnel)
- `actif` (boolean, defaut `true`)
- `deleted_at` (date, null si non supprime)
- `createdAt`, `updatedAt` (automatique Sequelize)

## 7) API routes

Base URL:

```text
http://localhost:8002/api/agences
```

| Methode | Route | Acces | Description |
|---|---|---|---|
| `GET` | `/` | user/admin/super_admin | Lister les agences non supprimees (`deleted_at = null`) |
| `GET` | `/:id` | user/admin/super_admin | Recuperer une agence non supprimee par ID |
| `GET` | `/deleted` | super_admin | Lister les agences supprimees (historique) |
| `POST` | `/` | super_admin | Creer une agence |
| `PUT` | `/:id` | super_admin | Mettre a jour une agence non supprimee |
| `DELETE` | `/:id` | super_admin | Soft delete (`deleted_at` rempli) |
| `PATCH` | `/:id/restore` | super_admin | Restaurer une agence supprimee |
| `PATCH` | `/:id/disable` | super_admin | Mettre `actif = false` |
| `PATCH` | `/:id/enable` | super_admin | Mettre `actif = true` |

Important:

- `GET /`, `GET /:id`, `PUT`, `DELETE` filtrent sur `deleted_at = null`.
- `GET /deleted` retourne uniquement les agences soft-delete, triees par `deleted_at DESC`.
- `PATCH /restore` ne restaure que les agences soft-delete.
- `PATCH /disable` et `PATCH /enable` utilisent `findByPk` (pas de filtre `deleted_at`).

## 8) Exemples de requetes

Definir un token:

```bash
TOKEN="Bearer <JWT_ICI>"
```

### 8.1 Creer une agence (super_admin)

```bash
curl -X POST http://localhost:8002/api/agences \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d @tests/json/create-agence.json
```

### 8.2 Lister les agences

```bash
curl -X GET http://localhost:8002/api/agences \
  -H "Authorization: $TOKEN"
```

### 8.3 Recuperer par ID

```bash
curl -X GET http://localhost:8002/api/agences/1 \
  -H "Authorization: $TOKEN"
```

### 8.4 Mettre a jour (super_admin)

```bash
curl -X PUT http://localhost:8002/api/agences/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d @tests/json/update-agence.json
```

### 8.5 Desactiver (super_admin)

```bash
curl -X PATCH http://localhost:8002/api/agences/1/disable \
  -H "Authorization: $TOKEN"
```

### 8.6 Activer (super_admin)

```bash
curl -X PATCH http://localhost:8002/api/agences/1/enable \
  -H "Authorization: $TOKEN"
```

### 8.7 Soft delete (super_admin)

```bash
curl -X DELETE http://localhost:8002/api/agences/1 \
  -H "Authorization: $TOKEN"
```

### 8.8 Voir l'historique des suppressions (super_admin)

```bash
curl -X GET http://localhost:8002/api/agences/deleted \
  -H "Authorization: $TOKEN"
```

### 8.9 Restaurer une agence supprimee (super_admin)

```bash
curl -X PATCH http://localhost:8002/api/agences/1/restore \
  -H "Authorization: $TOKEN"
```

## 9) Erreurs frequentes

- `400/500` Sequelize validation/DB error (ex: email invalide, `code` duplique, `email` duplique)
- `401` token absent/invalide
- `403` role super_admin requis
- `404` agence introuvable

Format d'erreur standard:

```json
{
  "message": "Internal Server Error"
}
```

## 10) Tests

Tests unitaires:

```bash
npm test
```

Tests integration:

```bash
npm run test:integration
```

Les tests integration utilisent PostgreSQL reel et configurent automatiquement:

- `NODE_ENV=test`
- `DATABASE_URL` base test
- `SECRET_KEY` test

## 11) JSON prets pour test manuel

Fichiers ajoutes:

- `tests/json/create-agence.json`
- `tests/json/create-agence-minimal.json`
- `tests/json/update-agence.json`
- `tests/json/create-agence-invalid-email.json`

Tu peux les utiliser directement avec `curl -d @<fichier>`.
