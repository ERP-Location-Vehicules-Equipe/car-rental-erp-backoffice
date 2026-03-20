# Frontend - Service d'Authentification & Gestion Utilisateurs (ERP Location de Voitures)

Ce projet est le Frontend React associé au microservice **Auth Service** du système ERP de location de voitures. Il s'agit d'une Single Page Application (SPA) développée avec **React**, propulsée par **Vite**, et stylisée avec **Tailwind CSS**.

Elle gère de bout en bout l'authentification (JWT), les rôles (employé/admin), et la gestion complète des comptes utilisateurs de l'entreprise.

---

## 🚀 Fonctionnalités Principales

### 🔐 Sécurité & Authentification
* **Authentification par Token JWT** (stocké de manière sécurisée dans le `localStorage`).
* **Intercepteurs Axios Globaux** : attachement automatique du token aux requêtes et déconnexion forcée en cas de token expiré (Erreur 401).
* **Routage Sécurisé (Protected & Public Routes)** : 
  * Impossible d'accéder au tableau de bord sans être connecté (pas de "flash" d'écran).
  * Impossible d'accéder à la page de Login si on est déjà connecté.
* **Gestion des rôles (RBAC)** : Les routes de gestion des utilisateurs sont strictement réservées aux Administrateurs.

### 👤 Fonctionnalités Utilisateur (Employés & Admins)
* **Connexion sécurisée** avec gestion d'erreurs en direct.
* **Tableau de Bord personnalisé** récapitulant l'accès.
* **Gestion du Profil** : Mise à jour de ses informations personnelles (Nom, Email) via un endpoint dédié.
* **Changement de Mot de passe** avec validation UI complète.

### 🛠️ Administration (Admins uniquement)
* **Liste des utilisateurs** (avec moteur de pagination/tri côté backend si implémenté).
* **Création de nouveaux employés** et attribution à une agence/succursale.
* **Edition des utilisateurs** (Changement de rôle, d'email, etc.).
* **Fiche Détails Utilisateur** complète.
* **Activation / Désactivation** des comptes en un clic.
* **Suppression logique (Soft Delete)** pour préserver l'intégrité de l'historique de l'ERP.

### 🌐 Expérience Utilisateur (UX)
* **Centralisation des Erreurs** : Utilitaire métier traduisant dynamiquement toutes les erreurs renvoyées par le backend (FastAPI/Pydantic) en français pour l'utilisateur, tout en évitant les logs polluants dans la console.
* **UI/UX Moderne et Responsive** construite intégralement avec des classes utilitaires de *Tailwind CSS* formattées aux standards de l'industrie.

---

## 📂 Architecture du Projet (Feature-Based)

Le projet suit une architecture propre et modulaire, favorisant la maintenabilité à long terme pour la suite de l'ERP.

```text
Frontend/
│
├── public/                 # Assets statiques (ex: logo.png)
├── src/
│   ├── api/                # Configuration d'Axios (Base URL, Intercepteurs)
│   │   └── api.js          # Client HTTP configuré
│   │
│   ├── Components/         # Composants UI partagés et réutilisables (Boutons, Modals, etc.)
│   │
│   ├── Layouts/            # Structures de pages globales
│   │   └── MainLayout.jsx  # Layout avec Sidebar/Navbar persistant post-login
│   │
│   ├── Pages/              # Vues organisées par domaines fonctionnels
│   │   ├── Auth/           # Pages de connexion
│   │   ├── Dashboard/      # Tableau de bord post-connexion
│   │   ├── Profile/        # Mon compte (Informations et Sécurité)
│   │   └── Users/          # CRUD Administration (Liste, Ajout, Détails, Edition)
│   │
│   ├── Routes/             # Composants de couverture pour la sécurité de la navigation
│   │   ├── ProtectedRoute.jsx  # Bloque les invités et gère les droits admin
│   │   └── PublicRoute.jsx     # Évite aux membres connectés de revoir l'écran de Login
│   │
│   ├── Services/           # Couche métier - Fonctions d'appels API
│   │   ├── authService.js  # Connexion, Déconnexion, Parsing JWT
│   │   └── userService.js  # Opérations CRUD utilisateurs
│   │
│   ├── utils/              # Fonctions utilitaires diverses
│   │   └── errorHandler.js # Traducteur global des erreurs venant de l'API FastAPI
│   │
│   ├── images/             # Images compilées par Vite (ex: logo utilisé en React)
│   │
│   ├── App.jsx             # Configuration racine des Routes React Router Dom
│   └── main.jsx            # Point d'entrée de l'application (React DOM)
│
├── index.html              # Fichier racine de l'app (et injection de Tailwind via CDN)
├── package.json            # Dépendances Node.js (React, Axios, React Router)
├── vite.config.js          # Configuration du bundler Vite
└── README.md               # Ce fichier
```

---

## 🛠️ Stack Technique

* **React 18** (UI Library)
* **Vite** (Build Tool ultra-rapide)
* **React Router v6** (Navigation SPA)
* **Axios** (Client HTTP asynchrone)
* **TailwindCSS** (Framework CSS intégré via CDN, sans configuration postcss locale lourde)

---

## ⚙️ Installation et Lancement Rapide

Vous devez disposer de **Node.js** (v16+ recommandé).

### 1. Cloner ou naviguer dans le projet
\`\`\`bash
cd code/Frontend
\`\`\`

### 2. Installer les dépendances
\`\`\`bash
npm install
\`\`\`

### 3. Démarrer le serveur de développement local
\`\`\`bash
npm run dev
\`\`\`
*(Le serveur se lance généralement sur `http://localhost:5173`)*

> **Note :** Assurez-vous que le **Auth Service (Backend FastAPI)** tourne simultanément sur `http://localhost:8000`. L'URL de l'API est définie par défaut dans `src/api/api.js`.

---

## 🔗 Documentation des Services (Couche Logique)

La logique de communication backend est extraite des composants UI pour respecter la séparation des préoccupations.

* **`authService.js`** contient `login(email, password)`, `logout()`, et `resetPassword()`.
* **`userService.js`** contient `getProfile()`, `updateMyProfile(data)` pour l'utilisateur courant, et tous les endpoints de gestion (`getAllUsers`, `createUser`, `updateUser`, `disableUser`, etc.) nécessitant l'élévation des privilèges.

## ⚠️ Notes de développement futur

* **Variables d'Environnement** : Il est recommandé plus tard de passer l'URL de l'API `http://localhost:8000/api` dans un fichier `.env` (`VITE_API_BASE_URL`) pour gérer facilement les déploiements de Pre-production et Production.
