### Service de Notification API : Champs Requis par Type de Requête

| Type de Requête | Champs Obligatoires (Communs) | Champs Spécifiques au Type |
| :--- | :--- | :--- |
| **`created`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `loan_id`, `loan_time` |
| **`updated`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `loan_id`, `loan_time` |
| **`canceled_loan`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `loan_id`, `loan_time` |
| **`status_updated`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `loan_id`, `loan_time`, `status` |
| **`transfer`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `car_id`, `source_agency`, `destination_agency`, `depart_date`, `arrival_date` |
| **`canceled_transfer`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `car_id`, `source_agency`, `destination_agency`, `depart_date`, `arrival_date` |
| **`maintenance_due`** | `type`, `channels`, `user_email`, `client_name`, `user_name`, `car_name` | `maintenance_type`, `due_date` |

---

### Description des Champs

#### 1. Champs Communs (Toutes les requêtes)
- **type** (string) : L'identifiant de l'événement (ex: "created", "maintenance_due").
- **channels** (array) : Liste des méthodes de notification, ex: `["email", "popup"]`.
- **user_email** (string) : L'adresse email du destinataire.
- **client_name** (string) : Nom du client (utiliser "Internal" pour les transferts ou la maintenance).
- **user_name** (string) : Nom de l'agent ou de l'utilisateur système effectuant l'action.
- **car_name** (string) : Le modèle ou la marque du véhicule.

#### 2. Champs Spécifiques aux Prêts (Loans)
- **loan_id** (integer) : Identifiant unique de la location.
- **loan_time** (string) : Horodatage ISO 8601 (ex: `2026-04-01T10:00:00`).
- **status** (string) : *Requis uniquement pour `status_updated`.* (ex: "completed").

#### 3. Champs Spécifiques aux Transferts
- **car_id** (string) : Identifiant unique du véhicule (ex: `CAR-789`).
- **source_agency** (string) : Agence de départ.
- **destination_agency** (string) : Agence de destination.
- **depart_date** (string) : Date de départ prévue.
- **arrival_date** (string) : Date d'arrivée prévue.

#### 4. Champs Spécifiques à la Maintenance
- **maintenance_type** (string) : Type d'intervention (ex: "Vidange", "Révision").
- **due_date** (string) : Date d'échéance de la maintenance.
