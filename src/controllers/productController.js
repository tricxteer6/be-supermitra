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

const JABODETABEK_BANDUNG_CITY_KEYS = new Set([
  "jakartapusat",
  "jakartautara",
  "jakartabarat",
  "jakartatimur",
  "jakartaselatan",
  "bogor",
  "kotabogor",
  "kabupatenbogor",
  "depok",
  "bekasi",
  "kotabekasi",
  "kabupatenbekasi",
  "tangerang",
  "kotatangerang",
  "kabupatentangerang",
  "tangerangselatan",
  "kota tangerang selatan".replace(/\s+/g, ""),
  "bandung",
  "kotabandung",
  "kabupatenbandung",
  "bandungbarat",
  "kabupatenbandungbarat",
  "cimahi",
]);

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isUserInJabodetabekBandung(userRegion) {
  const kota = normalizeKey(userRegion?.kota);
  if (!kota) return null;
  return JABODETABEK_BANDUNG_CITY_KEYS.has(kota);
}

function normalizeCoverageArea(value) {
  const v = String(value || "all").trim().toLowerCase();
  if (v === "jabodetabek_bandung") return "jabodetabek_bandung";
  if (v === "non_jabodetabek_bandung") return "non_jabodetabek_bandung";
  return "all";
}

function productAllowedForCoverage(coverageArea, isInJaboBandung) {
  const scope = normalizeCoverageArea(coverageArea);
  if (scope === "all") return true;
  if (isInJaboBandung == null) return false;
  if (scope === "jabodetabek_bandung") return isInJaboBandung;
  return !isInJaboBandung;
}

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

async function getUserRegion(userId) {
  if (!userId) return { kota: "", provinsi: "" };
  const [rows] = await db.query(
    "SELECT kota, provinsi FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  return rows?.[0] || { kota: "", provinsi: "" };
}

/** User-facing: list products (filter by user kemitraan when set) */
exports.getProducts = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const userKemitraan = req.user?.kemitraan ?? null;
    const hasCoverage = await hasCoverageAreaColumn();
    const userRegion = await getUserRegion(req.user?.id);
    const isInJaboBandung = isUserInJabodetabekBandung(userRegion);

    const sql = `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan${hasCoverage ? ", coverage_area" : ""}
       FROM products ORDER BY name`;
    const [rows] = await db.query(sql);
    const normalizedRows = rows.map((r) => ({
      ...r,
      coverage_area: normalizeCoverageArea(r.coverage_area),
    }));

    if (isAdmin || !userKemitraan) {
      return res.json(
        normalizedRows.filter((p) =>
          isAdmin ? true : productAllowedForCoverage(p.coverage_area, isInJaboBandung),
        ),
      );
    }

    const filtered = normalizedRows.filter(
      (p) =>
        productAllowedForKemitraan(p.kemitraan, userKemitraan) &&
        productAllowedForCoverage(p.coverage_area, isInJaboBandung),
    );
    res.json(filtered);
  } catch (err) {
    console.error("GET PRODUCTS ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  }
};

/** User-facing: get one product (must be allowed for user kemitraan) */
exports.getProductById = async (req, res) => {
  try {
    const hasCoverage = await hasCoverageAreaColumn();
    const [rows] = await db.query(
      `SELECT id, name, description, price_free, price_vip, image, category, stock, kemitraan${hasCoverage ? ", coverage_area" : ""}
       FROM products WHERE id = ?`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }
    const product = {
      ...rows[0],
      coverage_area: normalizeCoverageArea(rows[0].coverage_area),
    };
    const isAdmin = req.user?.role === "admin";
    const userKemitraan = req.user?.kemitraan || null;
    const userRegion = await getUserRegion(req.user?.id);
    const isInJaboBandung = isUserInJabodetabekBandung(userRegion);
    if (!isAdmin && userKemitraan) {
      const allowed = productAllowedForKemitraan(product.kemitraan, userKemitraan);
      const coverageAllowed = productAllowedForCoverage(product.coverage_area, isInJaboBandung);
      if (!allowed || !coverageAllowed) {
        return res.status(403).json({ message: "Produk tidak tersedia untuk kemitraan Anda" });
      }
    } else if (!isAdmin && !productAllowedForCoverage(product.coverage_area, isInJaboBandung)) {
      return res.status(403).json({ message: "Produk tidak tersedia untuk area Anda" });
    }
    res.json(product);
  } catch (err) {
    console.error("GET PRODUCT ERROR:", err);
    if (!res.headersSent) res.status(404).json({ message: "Produk tidak ditemukan" });
  }
};
