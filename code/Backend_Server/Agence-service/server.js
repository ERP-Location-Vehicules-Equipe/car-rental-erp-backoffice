import dotenv from "dotenv";
import app from "./src/app.js";
import sequelize from "./src/config/db.js";
import { createDatabaseIfNotExists } from "./src/config/initDB.js";
import "./src/models/agenceModel.js";

dotenv.config();

const PORT = process.env.PORT ;

const startServer = async () => {
  try {

    await createDatabaseIfNotExists();

    await sequelize.authenticate();
    console.log("Database connected successfully");

    // create tables
    await sequelize.sync({ alter: true });
    console.log("Tables synced");

    app.listen(PORT, () => {
      console.log(`Agence Service running on port ${PORT}`);
    });

  } catch (error) {
    console.error("Error starting server:", error.message);
  }
};

startServer();