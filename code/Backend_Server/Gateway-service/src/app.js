import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { authProxy, agenceProxy, usersProxy, financeProxy, fleetProxy, locationProxy, transferProxy, notificationProxy } from "./routes/index.js";
import { logger } from "./middlewares/loggerMiddleware.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();

const app = express();

// ==============================
// GLOBAL MIDDLEWARES
// ==============================
app.use(cors());
app.use(express.json());

// Logging
app.use(logger);

// ==============================
// ROUTES (PROXY)
// ==============================
app.use("/api/auth", authProxy);
app.use("/api/utilisateurs", usersProxy);
app.use("/api/agences", agenceProxy);
app.use("/api/finance", financeProxy);
app.use("/api/fleet", fleetProxy);
app.use("/api/location", locationProxy);
app.use("/api/transfer", transferProxy);
app.use("/api/notifications", notificationProxy);

// ==============================
// TEST ROUTE
// ==============================
app.get("/", (req, res) => {
  res.json({
    message: "API Gateway is running",
  });
});

// ==============================
// ERROR HANDLER
// ==============================
app.use(errorHandler);

export default app;
