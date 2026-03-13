const db = require("../config/db");

// GET /api/user/notifications?limit=10
exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 10, 50));

    const [rows] = await db.query(
      `SELECT id, type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit],
    );

    const [unreadRows] = await db.query(
      "SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0",
      [userId],
    );
    const unread = unreadRows && unreadRows[0] ? Number(unreadRows[0].total) : 0;

    res.json({ items: rows, unread });
  } catch (err) {
    console.error("GET MY NOTIFICATIONS ERROR:", err);
    res.status(500).json({ message: "Gagal mengambil notifikasi" });
  }
};

// POST /api/user/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID notifikasi tidak valid" });
    }
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    res.json({ message: "Notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("MARK NOTIFICATION READ ERROR:", err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};

// POST /api/user/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [userId],
    );
    res.json({ message: "Semua notifikasi ditandai sudah dibaca" });
  } catch (err) {
    console.error("MARK ALL NOTIFICATIONS READ ERROR:", err);
    res.status(500).json({ message: "Gagal memperbarui notifikasi" });
  }
};

