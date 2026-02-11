module.exports = (roles = ["admin", "vip"]) => {
  return (req, res, next) => {
    const userRole = (req.user.role || "").toLowerCase();
    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
