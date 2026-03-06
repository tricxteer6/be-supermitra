/**
 * Menambah kolom csro_phone ke tabel users jika belum ada.
 * Jalankan: node scripts/add-csro-phone-if-missing.js
 * (dari folder backend, dengan .env yang benar)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

async function run() {
  try {
    const [cols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'csro_phone'",
      [process.env.DB_NAME || "sm_mki"]
    );
    if (cols.length > 0) {
      console.log("Kolom csro_phone sudah ada di tabel users.");
      process.exit(0);
      return;
    }
    await db.query(
      "ALTER TABLE users ADD COLUMN csro_phone VARCHAR(24) NULL DEFAULT NULL COMMENT 'Nomor WA CSRO untuk repeat order'"
    );
    console.log("Kolom csro_phone berhasil ditambahkan ke tabel users.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    db.end?.();
  }
}

run();
