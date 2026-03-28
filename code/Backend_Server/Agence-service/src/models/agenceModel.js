import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

// Définition du modèle Agence
const Agence = sequelize.define("Agence", {

  // Identifiant unique auto-incrémenté
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // Nom de l'agence (obligatoire)
  nom: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  // Code unique de l'agence (ex: CASA01)
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  // Ville de l'agence
  ville: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  // Adresse complète
  adresse: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Numéro de téléphone
  telephone: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Email (doit être unique)
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true, // validation format email
    },
  },

  // Nom du responsable
  responsable_nom: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Heure d'ouverture (ex: 08:00)
  heure_ouverture: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Heure de fermeture (ex: 18:00)
  heure_fermeture: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Capacité maximale de véhicules
  capacite_max_vehicules: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Statut actif / inactif
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  // Soft delete (date de suppression)
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

}, {
  tableName: "agences",

  // Sequelize ajoute automatiquement createdAt et updatedAt
  timestamps: true,
});

export default Agence;