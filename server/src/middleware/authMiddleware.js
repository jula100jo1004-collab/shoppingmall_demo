const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401);
      return next(new Error("Access token is required"));
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401);
      return next(new Error("Access token is required"));
    }

    if (!process.env.JWT_SECRET) {
      res.status(500);
      return next(new Error("JWT_SECRET is not configured"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401);

    if (error.name === "TokenExpiredError") {
      return next(new Error("Token has expired"));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new Error("Invalid token"));
    }

    next(new Error("Unauthorized"));
  }
};

module.exports = authMiddleware;
