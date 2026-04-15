const db = require("../config/db");
const { deleteUploadedFile } = require("../utils/deleteUploadedFile");

let hasCoverageAreaColumnCache = null;

async function hasCoverageAreaColumn() {
  if (hasCoverageAreaColumnCache != null) return hasCoverageAreaColumnCache;
  try {
    const [rows] = await db.query(
      `SELECT 1
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'products'
         AND COLUMN_NAME = 'coverage_area'
       LIMIT 1`,
    );
    hasCoverageAreaColumnCache = Array.isArray(rows) && rows.length > 0;
  } catch {
    hasCoverageAreaColumnCache = false;
  }
  return hasCoverageAreaColumnCache;
}

function normalizeCoverageArea(value) {
  const v = String(value || "all").trim().toLowerCase();
  if (v === "jabodetabek_bandung") return "jabodetabek_bandung";
  if (v === "non_jabodetabek_bandung") return "non_jabodetabek_bandung";
  return "all";
}

exports.getAllProducts = async (req, res) => {
  try {
    const hasCoverage = await hasCoverageAreaColumn();
    const selectCoverage = hasCoverage ? ", coverage_area" : "";
    const [rows] = await db.query(
      `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan${selectCoverage}
       FROM products ORDER BY name`
    );
    const normalized = rows.map((r) => ({
      ...r,
      coverage_area: normalizeCoverageArea(r.coverage_area),
    }));
    res.json(normalized);
  } catch (err) {
    console.error("ADMIN GET PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const hasCoverage = await hasCoverageAreaColumn();
    const selectCoverage = hasCoverage ? ", coverage_area" : "";
    const [rows] = await db.query(
      `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan${selectCoverage}
       FROM products WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    res.json({
      ...rows[0],
      coverage_area: normalizeCoverageArea(rows[0].coverage_area),
    });
  } catch (err) {
    console.error("ADMIN GET PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

function normalizeKemitraan(kemitraan) {
  if (kemitraan == null || kemitraan === "") return null;
  if (Array.isArray(kemitraan)) {
    const joined = kemitraan.filter(Boolean).map((s) => String(s).trim()).join(",");
    return joined || null;
  }
  const s = String(kemitraan).trim();
  return s || null;
}

exports.createProduct = async (req, res) => {
  try {
    const { name, description, price_free, price_vip, category, stock, kemitraan, coverage_area } = req.body;
    if (!name || (price_free == null && price_vip == null)) {
      return res.status(400).json({ message: "Nama dan minimal satu harga wajib diisi" });
    }
    const imagePath = req.file ? `/public/product/${req.file.filename}` : null;
    const stockNum = parseInt(stock, 10);
    const priceFreeNum = parseFloat(
      price_free != null && price_free !== "" ? price_free : price_vip,
    );
    const priceVipNum = parseFloat(
      price_vip != null && price_vip !== "" ? price_vip : price_free,
    );
    const kemitraanVal = normalizeKemitraan(kemitraan);
    const coverageVal = normalizeCoverageArea(coverage_area);
    const hasCoverage = await hasCoverageAreaColumn();

    if (hasCoverage) {
      await db.query(
        `INSERT INTO products (name, description, price, price_free, price_vip, image, category, stock, kemitraan, coverage_area)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          isNaN(priceFreeNum) ? 0 : priceFreeNum,
          isNaN(priceFreeNum) ? 0 : priceFreeNum,
          isNaN(priceVipNum) ? (isNaN(priceFreeNum) ? 0 : priceFreeNum) : priceVipNum,
          imagePath,
          category || null,
          isNaN(stockNum) ? 0 : stockNum,
          kemitraanVal,
          coverageVal,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO products (name, description, price, price_free, price_vip, image, category, stock, kemitraan)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          isNaN(priceFreeNum) ? 0 : priceFreeNum,
          isNaN(priceFreeNum) ? 0 : priceFreeNum,
          isNaN(priceVipNum) ? (isNaN(priceFreeNum) ? 0 : priceFreeNum) : priceVipNum,
          imagePath,
          category || null,
          isNaN(stockNum) ? 0 : stockNum,
          kemitraanVal,
        ]
      );
    }
    res.status(201).json({ message: "Produk berhasil ditambah" });
  } catch (err) {
    console.error("ADMIN CREATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const { name, description, price_free, price_vip, category, stock, kemitraan, coverage_area } = req.body;
    const hasCoverage = await hasCoverageAreaColumn();
    const selectCoverage = hasCoverage ? ", coverage_area" : "";

    const [rows] = await db.query(
      `SELECT id, name, description, price, price_free, price_vip, image, category, stock, kemitraan${selectCoverage} FROM products WHERE id = ?`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    const current = rows[0];
    if (req.file && current.image) {
      deleteUploadedFile(current.image);
    }
    const imagePath = req.file ? `/public/product/${req.file.filename}` : current.image;
    const nameVal = name !== undefined ? name : current.name;
    const descVal = description !== undefined ? description : current.description;
    const priceFreeVal =
      price_free !== undefined && price_free !== ""
        ? parseFloat(price_free)
        : Number(current.price_free ?? current.price);
    const priceVipVal =
      price_vip !== undefined && price_vip !== ""
        ? parseFloat(price_vip)
        : Number(current.price_vip ?? priceFreeVal);
    const categoryVal = category !== undefined ? category : current.category;
    const stockVal = stock !== undefined ? parseInt(stock, 10) : current.stock;
    const kemitraanVal = kemitraan !== undefined ? normalizeKemitraan(kemitraan) : current.kemitraan;
    const coverageVal =
      coverage_area !== undefined
        ? normalizeCoverageArea(coverage_area)
        : normalizeCoverageArea(current.coverage_area);

    if (hasCoverage) {
      await db.query(
        `UPDATE products 
         SET name = ?, description = ?, price = ?, price_free = ?, price_vip = ?, image = ?, category = ?, stock = ?, kemitraan = ?, coverage_area = ?
         WHERE id = ?`,
        [
          nameVal,
          descVal,
          priceFreeVal,
          priceFreeVal,
          priceVipVal,
          imagePath,
          categoryVal,
          stockVal,
          kemitraanVal,
          coverageVal,
          id,
        ]
      );
    } else {
      await db.query(
        `UPDATE products 
         SET name = ?, description = ?, price = ?, price_free = ?, price_vip = ?, image = ?, category = ?, stock = ?, kemitraan = ?
         WHERE id = ?`,
        [
          nameVal,
          descVal,
          priceFreeVal,
          priceFreeVal,
          priceVipVal,
          imagePath,
          categoryVal,
          stockVal,
          kemitraanVal,
          id,
        ]
      );
    }
    res.json({ message: "Produk berhasil diupdate" });
  } catch (err) {
    console.error("ADMIN UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProduct = async (req, res) => {
  const productId = req.params.id;
  let connection;
  try {
    const [prodRows] = await db.query("SELECT image FROM products WHERE id = ?", [
      productId,
    ]);
    const imageToDelete = prodRows.length ? prodRows[0].image : null;

    connection = await db.getConnection();
    await connection.beginTransaction();

    await connection.query("DELETE FROM order_items WHERE product_id = ?", [productId]);
    const [result] = await connection.query("DELETE FROM products WHERE id = ?", [productId]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    await connection.commit();
    connection.release();
    deleteUploadedFile(imageToDelete);
    res.json({ message: "Produk berhasil dihapus" });
  } catch (err) {
    if (connection) {
      await connection.rollback().catch(() => {});
      connection.release();
    }
    console.error("ADMIN DELETE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
