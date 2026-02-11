/**
 * Creates products, orders, order_items tables.
 * Run from backend folder: node migrations/run-add-products-orders.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const db = require("../src/config/db");

const SQL = [
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    image VARCHAR(500) NULL,
    category VARCHAR(100) NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`,
];

async function run() {
  try {
    for (const sql of SQL) {
      await db.query(sql);
      const table = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || "";
      console.log("OK:", table);
    }
    const [rows] = await db.query("SELECT COUNT(*) AS c FROM products");
    if (rows[0].c === 0) {
      await db.query(
        `INSERT INTO products (name, description, price, category, stock) VALUES
         ('Contoh Produk Mitra', 'Deskripsi contoh produk untuk toko mitra.', 25000, 'Umum', 100)`
      );
      console.log("OK: seed product");
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
