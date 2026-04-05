# Front Fleet - Frontend React + Vite

Interface React pour la gestion de la flotte (véhicules et maintenance).

## Structure du dossier

```
front_fleet/
├── public/                    # Assets statiques (favicon, icons)
├── src/
│   ├── api/                   # Fichiers d'appel API vers backend
│   │   ├── vehicleApi.js      # Appels pour /vehicles
│   │   └── maintenanceApi.js  # Appels pour /maintenance
│   ├── components/            # Composants réutilisables
│   │   ├── Navbar.jsx         # Barre de navigation
│   │   ├── Navbar.css
│   │   ├── Footer.jsx         # Footer
│   │   └── Footer.css
│   ├── pages/                 # Pages principales (routes)
│   │   ├── FleetDashboard.jsx # Page d'accueil (/)
│   │   ├── FleetDashboard.css
│   │   ├── Vehicle.jsx        # Page gestion véhicules (/vehicle)
│   │   ├── Maintenance.jsx    # Page maintenance (/maintenance)
│   ├── assets/                # Images/SVG du projet
│   ├── App.jsx                # Composant root + routage
│   ├── App.css
│   ├── main.jsx               # Point d'entrée React
│   └── index.css              # Styles globaux
├── package.json               # Dépendances npm
├── vite.config.js             # Configuration Vite (dev server)
└── README.md                  # Ce fichier
```

## Prérequis

- Node.js 16+ + npm
- Backend `fleet-service` sur `http://localhost:8000` (requis pour CRUD)

## Installation

1. Entre dans le dossier :
   ```bash
   cd front_fleet
   ```

2. Installe les dépendances :
   ```bash
   npm install
   ```

3. Lancer le dev server :
   ```bash
   npm run dev
   ```

4. Ouvre dans le navigateur :
   - `http://localhost:5175/` (port par défaut, peut être 5173, 5174, etc. si occupé)

## Pages et Routes

| Route | Composant | Fonctionnalité |
|-------|-----------|---|
| `/` | FleetDashboard | Page d'accueil avec liens rapides |
| `/vehicle` | Vehicle | CRUD véhicules (list + create + update + delete) |
| `/maintenance` | Maintenance | CRUD maintenance (à compléter) |

## Communication avec le Backend

### Configuration API

- **Base URL** : `http://localhost:8000` (défini dans `src/api/*.js`)
- **Headers** : `Content-Type: application/json`
- **CORS** : autorisé depuis `http://localhost:5175` (configuré dans `fleet-service/main.py`)

### Exemple : Récupérer les véhicules

Fichier `src/api/vehicleApi.js` :
```javascript
export const getVehicles = async () => {
  const response = await fetch(`${API_BASE_URL}/vehicles`);
  return response.json();
}
```

Utilisation dans `src/pages/Vehicle.jsx` :
```javascript
const loadVehicles = async () => {
  const data = await getVehicles();
  setVehicles(data);
}
```

### Endpoints disponibles

**Véhicules** :
- `GET /vehicles` → liste tous
- `GET /vehicles/{id}` → détail
- `POST /vehicles` → créer
- `PUT /vehicles/{id}` → modifier
- `DELETE /vehicles/{id}` → supprimer

**Maintenance** :
- `GET /maintenance` → liste
- `POST /maintenance` → créer
- `PUT /maintenance/{id}` → modifier
- `DELETE /maintenance/{id}` → supprimer

## Scripts npm

```bash
npm run dev       # Démarrer Vite dev server
npm run build     # Build pour production
npm run preview   # Prévisualiser build local
npm run lint      # Linter (si configuré)
```

## Débogage

### Le frontend ne charge pas

- Vérifier `http://localhost:5175` (peut être 5173, 5174, 5176...)
- Vérifier la console du navigateur (DevTools `Ctrl+Shift+I`)

### Les données de véhicules ne s'affichent pas

1. Vérifier que le backend est lancé :
   ```bash
   curl http://localhost:8000/
   ```
   réponse attendue : `{ "message": "Fleet Service running 🚀" }`

2. Vérifier que les véhicules existent en DB :
   ```bash
   curl http://localhost:8000/vehicles
   ```

3. Vérifier les logs du navigateur (console DevTools) pour erreur CORS ou fetch

### CORS bloqué ("No 'Access-Control-Allow-Origin' header")

- S'assurer que `fleet-service/main.py` contient le middleware CORS
- Vérifier que `allow_origins` inclut `'http://localhost:5175'`

## Notes importantes

- Le port du frontend peut varier (5173, 5174, 5175, etc.) si occupé
- Le backend **doit tourner** sur port 8000 pour que tout fonctionne
- Les pages `Vehicle` et `Maintenance` sont en cours de développement (CRUD partiellement implémenté)

## Prochaines étapes

- [ ] Implémenter CRUD complet pour Maintenance
- [ ] Ajouter validation de formulaire + messages d'erreur
- [ ] Ajouter authentification (JWT token)
- [ ] Améliorer le design/responsivité
- [ ] Ajouter pagination/recherche

---

Pour toute question, vérifier les logs du navigateur + logs du backend (uvicorn).
