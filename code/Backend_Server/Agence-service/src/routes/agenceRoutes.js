import express from "express";
import {
  createAgence,
  getAllAgences,
  getAgenceById,
  updateAgence,
  deleteAgence,
  disableAgence,
  enableAgence
} from "../controllers/agenceController.js";

import { verifyToken } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();


// ==============================
// READ (user + admin)
// ==============================

router.get("/", verifyToken, getAllAgences);
router.get("/:id", verifyToken, getAgenceById);


// ==============================
// WRITE (admin only)
// ==============================

router.post("/", verifyToken, isAdmin, createAgence);
router.put("/:id", verifyToken, isAdmin, updateAgence);
router.delete("/:id", verifyToken, isAdmin, deleteAgence);


// ==============================
// STATUS (admin only)
// ==============================

router.patch("/:id/disable", verifyToken, isAdmin, disableAgence);
router.patch("/:id/enable", verifyToken, isAdmin, enableAgence);


export default router;