const authMiddleware = require("./authMiddleware");

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.user_type !== "admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }

  next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  requireAdmin: [authMiddleware, adminMiddleware],
};
