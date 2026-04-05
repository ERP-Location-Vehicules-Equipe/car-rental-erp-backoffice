### Service de Notification API : Champs Requis par Type de Requête


### Description des Champs

#### 1. Champs Communs (Toutes les requêtes)
- **type** (string) : L'identifiant de l'événement (ex: "created", "maintenance_due").
- **channels** (array) : Liste des méthodes de notification, ex: `["email", "popup"]`.
- **user_email** (string) : L'adresse email du destinataire.
- **client_name** (string) : Nom du client (utiliser "Internal" pour les transferts ou la maintenance).
- **user_name** (string) : Nom de l'agent ou de l'utilisateur système effectuant l'action.
- **car_name** (string) : Le modèle ou la marque du véhicule.
- **car_id** (string) : Identifiant unique du véhicule (ex: `CAR-789`).

#### 2. Champs Spécifiques aux Prêts (Loans)
- **loan_time** (string) : Horodatage ISO 8601 (ex: `2026-04-01T10:00:00`).
- **status** (string) : *Requis uniquement pour `status_updated`.* (ex: "completed").

#### 3. Champs Spécifiques aux Transferts
- **source_agency** (string) : Agence de départ.
- **destination_agency** (string) : Agence de destination.
- **depart_date** (string) : Date de départ prévue.
- **arrival_date** (string) : Date d'arrivée prévue.

#### 4. Champs Spécifiques à la Maintenance
- **due_date** (string) : Date d'échéance de la maintenance.
