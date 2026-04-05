import { Op } from "sequelize";
import Agence from "../models/agenceModel.js";

// ==============================
// CREATE AGENCE
// ==============================
export const createAgence = async (req, res, next) => {
  try {
    const data = req.body;
    const agence = await Agence.create(data);

    res.status(201).json(agence);
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET ALL AGENCES
// ==============================
export const getAllAgences = async (req, res, next) => {
  try {
    const agences = await Agence.findAll({
      where: { deleted_at: null },
    });

    res.json(agences);
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET DELETED AGENCES (HISTORIQUE)
// ==============================
export const getDeletedAgences = async (req, res, next) => {
  try {
    const agences = await Agence.findAll({
      where: {
        deleted_at: {
          [Op.ne]: null,
        },
      },
      order: [["deleted_at", "DESC"]],
    });

    res.json(agences);
  } catch (error) {
    next(error);
  }
};

// ==============================
// GET AGENCE BY ID
// ==============================
export const getAgenceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agence = await Agence.findOne({
      where: { id, deleted_at: null },
    });

    if (!agence) {
      return res.status(404).json({ message: "Agence not found" });
    }

    res.json(agence);
  } catch (error) {
    next(error);
  }
};

// ==============================
// UPDATE AGENCE
// ==============================
export const updateAgence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const agence = await Agence.findOne({
      where: { id, deleted_at: null },
    });

    if (!agence) {
      return res.status(404).json({ message: "Agence not found" });
    }

    await agence.update(data);

    res.json(agence);
  } catch (error) {
    next(error);
  }
};

// ==============================
// SOFT DELETE AGENCE
// ==============================
export const deleteAgence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agence = await Agence.findOne({
      where: { id, deleted_at: null },
    });

    if (!agence) {
      return res.status(404).json({ message: "Agence not found" });
    }

    await agence.update({ deleted_at: new Date() });

    res.json({ message: "Agence deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ==============================
// RESTORE AGENCE (SOFT DELETE)
// ==============================
export const restoreAgence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agence = await Agence.findOne({
      where: {
        id,
        deleted_at: {
          [Op.ne]: null,
        },
      },
    });

    if (!agence) {
      return res.status(404).json({ message: "Deleted agence not found" });
    }

    await agence.update({ deleted_at: null });

    res.json({
      message: "Agence restored successfully",
      agence,
    });
  } catch (error) {
    next(error);
  }
};

// ==============================
// DISABLE AGENCE
// ==============================
export const disableAgence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agence = await Agence.findByPk(id);

    if (!agence) {
      return res.status(404).json({ message: "Agence not found" });
    }

    await agence.update({ actif: false });

    res.json(agence);
  } catch (error) {
    next(error);
  }
};

// ==============================
// ENABLE AGENCE
// ==============================
export const enableAgence = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agence = await Agence.findByPk(id);

    if (!agence) {
      return res.status(404).json({ message: "Agence not found" });
    }

    await agence.update({ actif: true });

    res.json(agence);
  } catch (error) {
    next(error);
  }
};
