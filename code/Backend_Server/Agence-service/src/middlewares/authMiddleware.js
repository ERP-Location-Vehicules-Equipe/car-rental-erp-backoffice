import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {

  // Récupérer le header Authorization
  const authHeader = req.headers.authorization;

  // Vérifier si le token existe
  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided"
    });
  }

  // Extraire le token après "Bearer"
  const token = authHeader.split(" ")[1];

  try {

    // Vérifier et décoder le token JWT
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Stocker les infos utilisateur dans req.user
    req.user = decoded;

    // Passer à la route suivante
    next();

  } catch (error) {

    // Token invalide ou expiré
    return res.status(401).json({
      message: "Invalid or expired token"
    });

  }
};