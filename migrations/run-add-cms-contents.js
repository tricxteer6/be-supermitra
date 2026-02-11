/**
 * Creates cms_contents table for dynamic homepage / akses content.
 * Run from backend folder: node migrations/run-add-cms-contents.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../src/config/db");

const SQL = `CREATE TABLE IF NOT EXISTS cms_contents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255) NULL,
  body TEXT NULL,
  image VARCHAR(500) NULL,
  href VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

async function run() {
  try {
    await db.query(SQL);
    console.log("OK: cms_contents");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();

