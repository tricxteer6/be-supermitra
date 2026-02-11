/**
 * Adds profile_picture and photos columns to users table.
 * Run from backend folder: node migrations/run-add-profile-photos.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../src/config/db");

const ALTERS = [
  "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(500) NULL",
  "ALTER TABLE users ADD COLUMN photos TEXT NULL",
];

async function run() {
  try {
    for (const sql of ALTERS) {
      try {
        await db.query(sql);
        console.log("OK:", sql.split("ADD COLUMN ")[1]?.split(" ")[0] || sql);
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          console.log("Skip (already exists):", sql.split("ADD COLUMN ")[1]?.split(" ")[0]);
        } else {
          throw err;
        }
      }
    }
    console.log("Migration done.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
