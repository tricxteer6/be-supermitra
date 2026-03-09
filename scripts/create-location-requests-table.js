/**
 * Buat tabel location_requests untuk permintaan ubah titik lokasi mitra.
 * Jalankan: node scripts/create-location-requests-table.js
 * (dari folder backend, atau: node backend/scripts/create-location-requests-table.js)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

const SQL = `
CREATE TABLE IF NOT EXISTS location_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  requested_lat DOUBLE NOT NULL,
  requested_lng DOUBLE NOT NULL,
  status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by INT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

async function run() {
  try {
    await db.query(SQL);
    console.log("Tabel location_requests berhasil dibuat atau sudah ada.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
