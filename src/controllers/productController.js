const db = require("../config/db");

/** User-facing: list products (filter by user kemitraan when set) */
exports.getProducts = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const kemitraan = req.user?.kemitraan || null;

    let sql = `SELECT id, name, description, price, image, category, stock, kemitraan
       FROM products`;
    const params = [];

    if (!isAdmin && kemitraan) {
      sql += ` WHERE (kemitraan IS NULL OR kemitraan = ?)`;
      params.push(kemitraan);
    }
    sql += ` ORDER BY name`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  }
};

/** User-facing: get one product (must be allowed for user kemitraan) */
exports.getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, description, price, image, category, stock, kemitraan
       FROM products WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    const product = rows[0];
    const isAdmin = req.user?.role === "admin";
    const userKemitraan = req.user?.kemitraan || null;
    if (!isAdmin && userKemitraan && product.kemitraan != null && product.kemitraan !== userKemitraan) {
      return res.status(403).json({ message: "Produk tidak tersedia untuk kemitraan Anda" });
    }
    res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    if (!res.headersSent) res.status(404).json({ message: "Produk tidak ditemukan" });
  }
};
