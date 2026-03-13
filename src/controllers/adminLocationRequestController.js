const db = require("../config/db");
const { getDistanceMeters } = require("../utils/geo");
const { createNotification } = require("../utils/notifications");

/** GET /admin/location-requests — list permintaan (default: pending), dengan data user */
exports.getLocationRequests = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const [rows] = await db.query(
      `SELECT lr.id, lr.user_id, lr.requested_lat, lr.requested_lng, lr.status, lr.created_at,
              u.nama AS user_nama, u.email AS user_email, u.lat AS current_lat, u.lng AS current_lng, u.mitra_id
       FROM location_requests lr
       JOIN users u ON u.id = lr.user_id
       WHERE lr.status = ?
       ORDER BY lr.created_at DESC`,
      [status]
    );
    res.json(rows);
  } catch (err) {
    console.error("getLocationRequests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /admin/location-requests/count — jumlah permintaan pending (untuk badge) */
exports.getLocationRequestsCount = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS total FROM location_requests WHERE status = 'pending'"
    );
    const total = rows && rows[0] ? Number(rows[0].total) : 0;
    res.json({ count: total });
  } catch (err) {
    console.error("getLocationRequestsCount error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /admin/location-requests/:id/accept */
exports.acceptLocationRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminId = req.user.id;

    const [reqRows] = await db.query(
      "SELECT id, user_id, requested_lat, requested_lng FROM location_requests WHERE id = ? AND status = 'pending'",
      [id]
    );
    if (!reqRows || reqRows.length === 0) {
      return res.status(404).json({ message: "Permintaan tidak ditemukan atau sudah diproses" });
    }

    const { user_id, requested_lat, requested_lng } = reqRows[0];

    // Double-check: lokasi baru minimal 1 km dari mitra lain (selain user ini)
    const [others] = await db.query(
      `SELECT id, lat, lng FROM users
       WHERE lat IS NOT NULL AND lng IS NOT NULL AND id != ? AND role != 'admin'`,
      [user_id]
    );
    for (const o of others) {
      const dist = getDistanceMeters(requested_lat, requested_lng, o.lat, o.lng);
      if (dist < 1000) {
        await db.query(
          "UPDATE location_requests SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
          [adminId, id]
        );
        return res.status(400).json({
          message: "Lokasi terlalu dekat dengan mitra lain (minimal 1 km). Permintaan ditolak.",
        });
      }
    }

    await db.query(
      "UPDATE users SET lat = ?, lng = ? WHERE id = ?",
      [requested_lat, requested_lng, user_id],
    );
    await db.query(
      "UPDATE location_requests SET status = 'accepted', reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [adminId, id],
    );

    // Notifikasi ke user
    createNotification(user_id, {
      type: "location_accepted",
      title: "Permintaan ubah lokasi disetujui",
      message: "Lokasi cabang Anda telah diperbarui oleh admin.",
    });

    res.json({ message: "Permintaan lokasi disetujui" });
  } catch (err) {
    console.error("acceptLocationRequest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** PATCH /admin/location-requests/:id/reject */
exports.rejectLocationRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const adminId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, user_id FROM location_requests WHERE id = ? AND status = 'pending'",
      [id],
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Permintaan tidak ditemukan atau sudah diproses" });
    }

    const { user_id } = rows[0];
    await db.query(
      "UPDATE location_requests SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [adminId, id],
    );

    createNotification(user_id, {
      type: "location_rejected",
      title: "Permintaan ubah lokasi ditolak",
      message:
        "Permintaan ubah lokasi Anda ditolak oleh admin. Silakan hubungi admin jika membutuhkan bantuan.",
    });

    res.json({ message: "Permintaan lokasi ditolak" });
  } catch (err) {
    console.error("rejectLocationRequest error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
