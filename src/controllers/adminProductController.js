const db = require("../config/db");

exports.getAllProducts = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, description, price, image, category, stock, kemitraan
       FROM products ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    console.error("ADMIN GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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
    res.json(rows[0]);
  } catch (err) {
    console.error("ADMIN GET PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, kemitraan } = req.body;
    if (!name || price == null) {
      return res.status(400).json({ message: "Nama dan harga wajib diisi" });
    }
    const imagePath = req.file ? `/public/product/${req.file.filename}` : null;
    const stockNum = parseInt(stock, 10);
    const priceNum = parseFloat(price);
    await db.query(
      `INSERT INTO products (name, description, price, image, category, stock, kemitraan)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        isNaN(priceNum) ? 0 : priceNum,
        imagePath,
        category || null,
        isNaN(stockNum) ? 0 : stockNum,
        kemitraan || null,
      ]
    );
    res.status(201).json({ message: "Produk berhasil ditambah" });
  } catch (err) {
    console.error("ADMIN CREATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price, category, stock, kemitraan } = req.body;

    const [rows] = await db.query(
      "SELECT id, name, description, price, image, category, stock, kemitraan FROM products WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    const current = rows[0];

    const imagePath = req.file ? `/public/product/${req.file.filename}` : current.image;
    const nameVal = name !== undefined ? name : current.name;
    const descVal = description !== undefined ? description : current.description;
    const priceVal = price !== undefined ? parseFloat(price) : Number(current.price);
    const categoryVal = category !== undefined ? category : current.category;
    const stockVal = stock !== undefined ? parseInt(stock, 10) : current.stock;
    const kemitraanVal = kemitraan !== undefined ? (kemitraan || null) : current.kemitraan;

    await db.query(
      `UPDATE products SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ?, kemitraan = ? WHERE id = ?`,
      [nameVal, descVal, priceVal, imagePath, categoryVal, stockVal, kemitraanVal, id]
    );
    res.json({ message: "Produk berhasil diupdate" });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    res.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    console.error("ADMIN DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
