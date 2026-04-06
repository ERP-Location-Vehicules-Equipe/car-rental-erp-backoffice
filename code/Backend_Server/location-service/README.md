🚗 Location Service – ERP Auto

📌 Description

Le Location Service est un microservice développé dans le cadre du projet ERP Auto.
Il permet de gérer les locations de véhicules de manière simple et efficace.

Ce service couvre tout le cycle de vie d’une location : création, modification, suppression, gestion des statuts et retour avec calcul automatique des pénalités.

⸻

🎯 Objectifs
	•	Gérer les locations de véhicules
	•	Effectuer les opérations CRUD
	•	Gérer les statuts (en cours, terminée, annulée)
	•	Calculer automatiquement le montant total
	•	Gérer le retour avec pénalité
	•	Fournir des statistiques (dashboard)

⸻

🛠️ Technologies utilisées

Backend :
	•	FastAPI
	•	SQLAlchemy
	•	PostgreSQL

Frontend :
	•	React.js
	•	Axios
	•	CSS

Outils :
	•	Docker
	•	pgAdmin
	•	Swagger

⸻

🏗️ Architecture

Le service est structuré en plusieurs parties :
	•	Routes : gestion des endpoints API
	•	Controller : logique métier
	•	Models : structure de la base de données
	•	Schemas : validation des données

⸻

⚙️ Fonctionnalités

Gestion des locations :
	•	Création d’une location
	•	Consultation de toutes les locations
	•	Consultation par ID
	•	Modification
	•	Suppression

Gestion des statuts :
	•	en_cours
	•	terminée
	•	annulée

Retour avec pénalité :
	•	Calcul du retard
	•	Application de la pénalité
	•	Mise à jour du montant total
	•	Passage du statut en terminée

Statistiques :
	•	Total des locations
	•	Locations en cours
	•	Locations terminées
	•	Locations annulées
	•	Revenu total

⸻

🌐 API Endpoints
	•	GET /locations → Liste des locations
	•	POST /locations → Créer une location
	•	GET /locations/{id} → Détail
	•	PUT /locations/{id} → Modifier
	•	DELETE /locations/{id} → Supprimer
	•	PUT /locations/{id}/status → Changer statut
	•	PUT /locations/{id}/retour → Retour avec pénalité
	•	GET /locations/stats → Statistiques

⸻

🧪 Test de l’API

Swagger est disponible sur :
http://localhost:8002/docs

Il permet de tester les endpoints et vérifier le fonctionnement.

⸻

🐳 Lancement avec Docker

docker compose up –build

⸻

📂 Structure du projet

app/
├── config/
├── Model/
├── Schemas/
├── Controller/
├── Routes/
└── main.py

⸻

📈 Résultats

Le service permet :
	•	Une gestion complète des locations
	•	Un suivi clair des statuts
	•	Un calcul automatique du montant
	•	Une visualisation via dashboard

⸻

✅ Conclusion

Le Location Service est un microservice fonctionnel et conforme au cahier de charge.
Il permet une gestion efficace des locations dans le système ERP.

⸻

👨‍💻 Auteurs

Fatima zahra Mghizlat idrissi
Amal mahboubi 