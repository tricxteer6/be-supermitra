/**
 * Add kemitraan column to products (NULL = available to all).
 * Run from backend folder: node migrations/add_products_kemitraan.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../src/config/db");

const SQL = `ALTER TABLE products ADD COLUMN kemitraan VARCHAR(100) NULL`;

async function run() {
  try {
    await db.query(SQL);
    console.log("OK: products.kemitraan added");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Skip: kemitraan already exists");
    } else {
      console.error("Migration failed:", err.message);
      process.exit(1);
    }
  } finally {
    process.exit(0);
  }
}

run();
