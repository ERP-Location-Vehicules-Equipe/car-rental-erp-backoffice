export const isSuperAdmin = (req, res, next) => {
  // Seul le super admin peut gérer les données d'agence.
  if (!req.user || req.user.role !== "super_admin") {
    return res.status(403).json({
      message: "Access denied (super admin only)",
    });
  }

  next();
};
