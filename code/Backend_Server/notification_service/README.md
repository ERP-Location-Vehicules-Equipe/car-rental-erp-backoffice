Service de Notification (Notification Service)

Un microservice asynchrone performant construit avec FastAPI, RabbitMQ, et aiosmtplib. Ce service gère l'envoi de notifications multi-canaux (Email et Popup) en utilisant un modèle de conception producteur-consommateur.
🚀 Présentation de l'Architecture

Le service fonctionne selon un modèle de file d'attente découplé :

    API (Producteur) : Reçoit les requêtes HTTP POST, valide les données via des schémas Pydantic et les envoie vers RabbitMQ.

    Broker de Messages : RabbitMQ stocke les notifications dans une file d'attente durable nommée notifications.

    Worker (Consommateur) : Un processus asynchrone qui récupère les messages, détermine le type de notification (Prêt vs Transfert) et délègue l'envoi au service approprié.

📁 Structure du Projet
Plaintext

.
├── app
│   ├── api             # Points de terminaison HTTP (FastAPI)
│   ├── core            # Configuration & Réglages (Pydantic)
│   ├── messaging       # Logique Producteur & Consommateur RabbitMQ
│   ├── schemas         # Modèles de validation de données
│   └── services        # Logique métier (Gestion d'emails & Templates)
├── worker.py           # Point d'entrée pour le processus consommateur
├── docker-compose.yml  # Orchestration de l'infrastructure
└── .env                # Variables d'environnement et secrets

🛠 Fonctionnalités

    Async/Await : Opérations E/S non-bloquantes pour RabbitMQ et SMTP.

    Templating Dynamique : Sélection automatique entre les modèles loan.py (prêt) et transfer.py (transfert).

    Intégration SMTP : Configuré pour des fournisseurs modernes comme Resend, Brevo ou Gmail.

    Fiabilité : Utilisation de aio-pika pour une gestion robuste des connexions et de la persistance des messages.

⚙️ Configuration

Créez un fichier .env à la racine du projet :
Bash

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# SMTP (Exemple pour Resend)
SMTP_SERVER=smtp.resend.com
SMTP_PORT=465
SMTP_USERNAME=resend
SMTP_PASSWORD=re_votre_cle_api
EMAIL_FROM=notifications@votre-domaine.com

# App
APP_NAME=notification_service
DEBUG=True

📦 Installation et Exécution
Via Docker (Recommandé)
Bash

# Construire et démarrer les services (API, Worker, RabbitMQ)
docker-compose up -d --build

Installation Manuelle

    Installer les dépendances :
    Bash

    pip install -r requirements.txt

    Lancer l'API :
    Bash

    uvicorn app.main:app --host 0.0.0.0 --port 8000

    Lancer le Worker :
    Bash

    python worker.py

📡 Utilisation de l'API

Endpoint : POST /notifications/notify

Exemple de requête (CURL) :
Bash

curl -X POST http://localhost:8000/notifications/notify \
-H "Content-Type: application/json" \
-d '{
    "type": "loan_created",
    "channels": ["email"],
    "loan_id": 123,
    "client_email": "client@example.com",
    "client_name": "John Doe",
    "car_name": "Toyota Corolla"
}'

📧 Logique Interne

    email_service.py : Gère la connexion SMTP bas niveau et l'expédition sécurisée (TLS/SSL).

    handler.py : Agit comme un routeur pour choisir le bon template d'email selon le contenu du message reçu.
