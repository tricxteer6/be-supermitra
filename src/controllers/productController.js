const db = require("../config/db");

/** Cek apakah produk boleh dilihat user (kemitraan produk kosong = semua; isi = user harus punya minimal satu kemitraan di list; user boleh punya 2 kemitraan dipisah koma) */
function productAllowedForKemitraan(productKemitraanStr, userKemitraan) {
  const kem = (productKemitraanStr ?? "").toString().trim();
  if (!kem) return true;
  const userRaw = (userKemitraan ?? "").toString().trim();
  if (!userRaw) return true;
  const productList = kem.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const userKems = userRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (userKems.length === 0) return true;
  return userKems.some((uk) => productList.includes(uk));
}

/** User-facing: list products (filter by user kemitraan when set) */
exports.getProducts = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const userKemitraan = req.user?.kemitraan ?? null;

    const sql = `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan
       FROM products ORDER BY name`;
    const [rows] = await db.query(sql);

    if (isAdmin || !userKemitraan) {
      return res.json(rows);
    }

    const filtered = rows.filter((p) => productAllowedForKemitraan(p.kemitraan, userKemitraan));
    res.json(filtered);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  }
};

/** User-facing: get one product (must be allowed for user kemitraan) */
exports.getProductById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan
       FROM products WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    const product = rows[0];
    const isAdmin = req.user?.role === "admin";
    const userKemitraan = req.user?.kemitraan || null;
    if (!isAdmin && userKemitraan) {
      const allowed = productAllowedForKemitraan(product.kemitraan, userKemitraan);
      if (!allowed) {
        return res.status(403).json({ message: "Produk tidak tersedia untuk kemitraan Anda" });
      }
    }
    res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    if (!res.headersSent) res.status(404).json({ message: "Produk tidak ditemukan" });
  }
};
