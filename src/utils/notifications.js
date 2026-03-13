const db = require("../config/db");

/**
 * Buat satu notifikasi sederhana untuk user.
 * @param {number} userId
 * @param {{ title: string, message?: string, type?: string }} payload
 */
async function createNotification(userId, payload) {
  if (!userId || !payload || !payload.title) return;
  const { title, message = null, type = null } = payload;
  try {
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)",
      [userId, title, message, type],
    );
  } catch (err) {
    console.error("CREATE NOTIFICATION ERROR:", err.message || err);
  }
}

module.exports = {
  createNotification,
};

