import express from "express";
import cors from "cors";
import agenceRoutes from "./routes/agenceRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

// routes
app.use("/api/agences", agenceRoutes);

// error handler (IMPORTANT)
app.use(errorHandler);

export default app;