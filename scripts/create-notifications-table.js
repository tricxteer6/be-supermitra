/**
 * Buat tabel notifications untuk menyimpan notifikasi user (mitra & admin).
 * Jalankan: node scripts/create-notifications-table.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

const SQL = `
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_user_read (user_id, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

async function run() {
  try {
    await db.query(SQL);
    console.log("Tabel notifications berhasil dibuat atau sudah ada.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();

