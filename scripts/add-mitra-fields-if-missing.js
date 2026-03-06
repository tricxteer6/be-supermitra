/**
 * Menambah kolom mitra_join_date dan mitra_id ke tabel users jika belum ada.
 * Jalankan: node scripts/add-mitra-fields-if-missing.js
 * (dari folder backend, dengan .env yang benar)
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

async function run() {
  try {
    const dbName = process.env.DB_NAME || "sm_mki";

    // Cek kolom mitra_join_date
    const [joinCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mitra_join_date'",
      [dbName]
    );
    if (joinCols.length === 0) {
      await db.query(
        "ALTER TABLE users ADD COLUMN mitra_join_date DATE NULL DEFAULT NULL COMMENT 'Tanggal mitra bergabung'"
      );
      console.log("Kolom mitra_join_date berhasil ditambahkan ke tabel users.");
    } else {
      console.log("Kolom mitra_join_date sudah ada di tabel users.");
    }

    // Cek kolom mitra_id
    const [idCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'mitra_id'",
      [dbName]
    );
    if (idCols.length === 0) {
      await db.query(
        "ALTER TABLE users ADD COLUMN mitra_id VARCHAR(32) NULL DEFAULT NULL COMMENT 'ID mitra berdasarkan tahun-bulan dan urutan (YYYYMMNNN)'"
      );
      await db.query("CREATE INDEX IF NOT EXISTS idx_users_mitra_id ON users(mitra_id)");
      console.log("Kolom mitra_id berhasil ditambahkan ke tabel users.");
    } else {
      console.log("Kolom mitra_id sudah ada di tabel users.");
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    db.end?.();
  }
}

run();

