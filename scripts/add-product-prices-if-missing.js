/**
 * Menambah kolom price_free dan price_vip ke tabel products jika belum ada.
 * Jalankan: node scripts/add-product-prices-if-missing.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

async function run() {
  try {
    const dbName = process.env.DB_NAME;

    const [freeCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'price_free'",
      [dbName],
    );
    if (freeCols.length === 0) {
      await db.query(
        "ALTER TABLE products ADD COLUMN price_free DECIMAL(10,2) NULL AFTER price",
      );
      console.log("Kolom price_free berhasil ditambahkan.");
    } else {
      console.log("Kolom price_free sudah ada.");
    }

    const [vipCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'price_vip'",
      [dbName],
    );
    if (vipCols.length === 0) {
      await db.query(
        "ALTER TABLE products ADD COLUMN price_vip DECIMAL(10,2) NULL AFTER price_free",
      );
      console.log("Kolom price_vip berhasil ditambahkan.");
    } else {
      console.log("Kolom price_vip sudah ada.");
    }

    // Inisialisasi nilai awal: jika price_free/vip NULL, isi dengan kolom price
    await db.query(
      "UPDATE products SET price_free = price WHERE price_free IS NULL",
    );
    await db.query(
      "UPDATE products SET price_vip = price_free WHERE price_vip IS NULL",
    );

    console.log("Inisialisasi harga free/vip selesai.");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    db.end?.();
  }
}

run();

