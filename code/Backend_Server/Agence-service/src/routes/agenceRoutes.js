import express from "express";
import {
  createAgence,
  getAllAgences,
  getDeletedAgences,
  getAgenceById,
  updateAgence,
  deleteAgence,
  restoreAgence,
  disableAgence,
  enableAgence
} from "../controllers/agenceController.js";

import { verifyToken } from "../middlewares/authMiddleware.js";
import { isSuperAdmin } from "../middlewares/roleMiddleware.js";

const router = express.Router();


// ==============================
// READ (user + admin)
// ==============================

router.get("/", verifyToken, getAllAgences);
router.get("/deleted", verifyToken, isSuperAdmin, getDeletedAgences);
router.get("/:id", verifyToken, getAgenceById);


// ==============================
// WRITE (super admin only)
// ==============================

router.post("/", verifyToken, isSuperAdmin, createAgence);
router.put("/:id", verifyToken, isSuperAdmin, updateAgence);
router.delete("/:id", verifyToken, isSuperAdmin, deleteAgence);
router.patch("/:id/restore", verifyToken, isSuperAdmin, restoreAgence);


// ==============================
// STATUS (super admin only)
// ==============================

router.patch("/:id/disable", verifyToken, isSuperAdmin, disableAgence);
router.patch("/:id/enable", verifyToken, isSuperAdmin, enableAgence);


export default router;
