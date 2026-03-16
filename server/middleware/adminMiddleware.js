function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      message: "Admin access only"
    });
  }

  return next();
}

module.exports = {
  requireAdmin
};
