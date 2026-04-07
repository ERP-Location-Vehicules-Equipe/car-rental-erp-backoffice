import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Fonction pour créer la base de données si elle n'existe pas
export const createDatabaseIfNotExists = async () => {

  // Extraire les informations depuis DATABASE_URL
  const dbUrl = new URL(process.env.DATABASE_URL);

  // Récupérer le nom de la base de données
  const dbName = dbUrl.pathname.replace("/", "");

  // Connexion à la base par défaut "postgres"
  const sequelize = new Sequelize("postgres", dbUrl.username, dbUrl.password, {
    host: dbUrl.hostname,
    port: dbUrl.port,
    dialect: "postgres",
    logging: false,
  });

  try {

    // Essayer de créer la base de données
    await sequelize.query(`CREATE DATABASE ${dbName};`);
    console.log(`Database ${dbName} created`);

  } catch (error) {

    // Si la base existe déjà
    if (error.original?.code === "42P04") {
      console.log(`Database ${dbName} already exists`);
    } else {
      console.error("Error creating database:", error.message);
    }

  } finally {

    // Fermer la connexion
    await sequelize.close();
  }
};