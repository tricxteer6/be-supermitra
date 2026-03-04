module.exports = function requirePermissions(required = []) {
  return (req, res, next) => {
    const role = (req.user?.role || "").toLowerCase();

    if (role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const perms = Array.isArray(req.user?.permissions)
      ? req.user.permissions.map((p) => String(p).toLowerCase())
      : [];

    const needed = required.map((p) => String(p).toLowerCase());

    // Backward compatibility: jika admin belum punya admin_permissions sama sekali,
    // treat sebagai full-access admin agar tidak langsung 403 setelah fitur ini ditambah.
    if (needed.length > 0 && perms.length === 0) {
      return next();
    }

    const hasAll = needed.every((p) => perms.includes(p));

    if (!hasAll) {
      return res.status(403).json({ message: "Insufficient admin permission" });
    }

    next();
  };
}

