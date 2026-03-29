import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ==============================
// AUTH SERVICE
// ==============================
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
  })
);

// ==============================
// AGENCE SERVICE
// ==============================
app.use(
  "/api/agences",
  createProxyMiddleware({
    target: process.env.AGENCE_SERVICE_URL,
    changeOrigin: true,
  })
);

// TEST
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is running" });
});

export default app;