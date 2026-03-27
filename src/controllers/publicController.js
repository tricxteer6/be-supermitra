const db = require("../config/db");

function provincesByIsland(pulau) {
  const key = String(pulau || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  const SUMATERA = [
    "Aceh",
    "Sumatera Utara",
    "Sumatera Barat",
    "Riau",
    "Jambi",
    "Sumatera Selatan",
    "Bengkulu",
    "Lampung",
    "Kepulauan Bangka Belitung",
    "Kepulauan Riau",
  ];
  const JAWA = [
    "Banten",
    "DKI Jakarta",
    "Jawa Barat",
    "Jawa Tengah",
    "DI Yogyakarta",
    "Jawa Timur",
  ];
  const KALIMANTAN = [
    "Kalimantan Barat",
    "Kalimantan Tengah",
    "Kalimantan Selatan",
    "Kalimantan Timur",
    "Kalimantan Utara",
  ];
  const SULAWESI = [
    "Sulawesi Utara",
    "Sulawesi Tengah",
    "Sulawesi Selatan",
    "Sulawesi Tenggara",
    "Gorontalo",
    "Sulawesi Barat",
  ];
  const BALI_NUSA = ["Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur"];
  const MALUKU = ["Maluku", "Maluku Utara"];
  const PAPUA = [
    "Papua",
    "Papua Barat",
    "Papua Barat Daya",
    "Papua Selatan",
    "Papua Tengah",
  ];

  if (!key) return null;
  if (key.includes("sumatera")) return SUMATERA;
  if (key.includes("jawa")) return JAWA;
  if (key.includes("kalimantan") || key.includes("borneo")) return KALIMANTAN;
  if (key.includes("sulawesi") || key.includes("celebes")) return SULAWESI;
  if (key.includes("bali") || key.includes("nusa tenggara") || key.includes("ntb") || key.includes("ntt")) return BALI_NUSA;
  if (key.includes("maluku")) return MALUKU;
  if (key.includes("papua")) return PAPUA;
  return null;
}

function islandCaseSql() {
  return `
    CASE
      WHEN provinsi IN ('Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau') THEN 'Sumatera'
      WHEN provinsi IN ('Banten','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur') THEN 'Jawa'
      WHEN provinsi IN ('Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara') THEN 'Kalimantan'
      WHEN provinsi IN ('Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat') THEN 'Sulawesi'
      WHEN provinsi IN ('Bali','Nusa Tenggara Barat','Nusa Tenggara Timur') THEN 'Bali & Nusa Tenggara'
      WHEN provinsi IN ('Maluku','Maluku Utara') THEN 'Maluku'
      WHEN provinsi IN ('Papua','Papua Barat','Papua Barat Daya','Papua Selatan','Papua Tengah') THEN 'Papua'
      ELSE 'Lainnya'
    END
  `;
}

exports.getPublicUsers = async (req, res) => {
  try {
    const {
      pulau,
      provinsi,
      kota,
      kecamatan,
      kelurahan,
      aggregate,
      level,
      minLat,
      maxLat,
      minLng,
      maxLng,
    } = req.query || {};
    const limitRaw = req.query?.limit;
    const limit = limitRaw != null ? parseInt(limitRaw, 10) : null;

    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];

    // Filter by island (mapping -> list of provinces)
    if (pulau) {
      const provList = provincesByIsland(pulau);
      if (Array.isArray(provList) && provList.length) {
        conditions.push(`provinsi IN (${provList.map(() => "?").join(",")})`);
        params.push(...provList);
      }
    }

    if (provinsi) {
      conditions.push("provinsi = ?");
      params.push(provinsi);
    }
    if (kota) {
      conditions.push("kota = ?");
      params.push(kota);
    }
    if (kecamatan) {
      conditions.push("kecamatan = ?");
      params.push(kecamatan);
    }
    if (kelurahan) {
      conditions.push("kelurahan = ?");
      params.push(kelurahan);
    }
    if (minLat != null && maxLat != null) {
      conditions.push("lat BETWEEN ? AND ?");
      params.push(Number(minLat), Number(maxLat));
    }
    if (minLng != null && maxLng != null) {
      conditions.push("lng BETWEEN ? AND ?");
      params.push(Number(minLng), Number(maxLng));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitClause = Number.isFinite(limit) && limit > 0 ? `LIMIT ?` : "";
    const doAggregate = String(aggregate || "0") === "1";
    const lvl = String(level || "provinsi").toLowerCase();
    let sql = "";

    if (doAggregate) {
      const islandExpr = islandCaseSql();
      if (lvl === "pulau") {
        sql = `
          SELECT
            CONCAT('pulau-', island) AS id,
            island AS nama,
            NULL AS kota,
            NULL AS provinsi,
            NULL AS kemitraan,
            AVG(lat) AS lat,
            AVG(lng) AS lng,
            NULL AS profile_picture,
            MIN(sample_user_id) AS sample_user_id,
            COUNT(*) AS total,
            1 AS is_aggregate,
            'pulau' AS level
          FROM (
            SELECT
              ${islandExpr} AS island,
              id AS sample_user_id,
              lat,
              lng
            FROM users
            ${where}
          ) t
          GROUP BY island
          ORDER BY total DESC
          ${limitClause}
        `;
      } else if (lvl === "provinsi") {
        sql = `
          SELECT
            CONCAT('prov-', provinsi) AS id,
            provinsi AS nama,
            NULL AS kota,
            provinsi,
            NULL AS kemitraan,
            AVG(lat) AS lat,
            AVG(lng) AS lng,
            NULL AS profile_picture,
            MIN(id) AS sample_user_id,
            COUNT(*) AS total,
            1 AS is_aggregate,
            'provinsi' AS level
          FROM users
          ${where}
          GROUP BY provinsi
          ORDER BY total DESC
          ${limitClause}
        `;
      } else if (lvl === "kota") {
        sql = `
          SELECT
            CONCAT('kota-', provinsi, '-', kota) AS id,
            kota AS nama,
            kota,
            provinsi,
            NULL AS kemitraan,
            AVG(lat) AS lat,
            AVG(lng) AS lng,
            NULL AS profile_picture,
            MIN(id) AS sample_user_id,
            COUNT(*) AS total,
            1 AS is_aggregate,
            'kota' AS level
          FROM users
          ${where}
          GROUP BY provinsi, kota
          ORDER BY total DESC
          ${limitClause}
        `;
      } else if (lvl === "kecamatan") {
        sql = `
          SELECT
            CONCAT('kec-', provinsi, '-', kota, '-', kecamatan) AS id,
            kecamatan AS nama,
            kota,
            provinsi,
            NULL AS kemitraan,
            AVG(lat) AS lat,
            AVG(lng) AS lng,
            NULL AS profile_picture,
            MIN(id) AS sample_user_id,
            COUNT(*) AS total,
            1 AS is_aggregate,
            'kecamatan' AS level
          FROM users
          ${where}
          GROUP BY provinsi, kota, kecamatan
          ORDER BY total DESC
          ${limitClause}
        `;
      } else {
        sql = `
          SELECT
            CONCAT('kel-', provinsi, '-', kota, '-', kecamatan, '-', kelurahan) AS id,
            kelurahan AS nama,
            kota,
            provinsi,
            NULL AS kemitraan,
            AVG(lat) AS lat,
            AVG(lng) AS lng,
            NULL AS profile_picture,
            MIN(id) AS sample_user_id,
            COUNT(*) AS total,
            1 AS is_aggregate,
            'kelurahan' AS level
          FROM users
          ${where}
          GROUP BY provinsi, kota, kecamatan, kelurahan
          ORDER BY total DESC
          ${limitClause}
        `;
      }
    } else {
      sql = `
        SELECT 
          id,
          nama,
          kota,
          provinsi,
          kemitraan,
          lat,
          lng,
          profile_picture,
          id AS sample_user_id,
          1 AS total,
          0 AS is_aggregate,
          'mitra' AS level
        FROM users
        ${where}
        ORDER BY id DESC
        ${limitClause}
      `;
    }

    if (limitClause) params.push(limit);
    const [users] = await db.query(sql, params);
    return res.json(Array.isArray(users) ? users : []);
  } catch (err) {
    console.error("PUBLIC USERS ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  }
};

async function buildDistinctQuery(field, conditions, params) {
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "WHERE 1=1";
  const [rows] = await db.query(
    `
    SELECT DISTINCT ${field} as value
    FROM users
    ${where}
    AND ${field} IS NOT NULL
    AND TRIM(${field}) <> ''
    ORDER BY ${field} ASC
    `,
    params,
  );
  return rows.map((r) => r.value).filter(Boolean);
}

exports.getPublicProvinces = async (req, res) => {
  try {
    const { pulau } = req.query || {};
    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];
    if (pulau) {
      const provList = provincesByIsland(pulau);
      if (Array.isArray(provList) && provList.length) {
        conditions.push(`provinsi IN (${provList.map(() => "?").join(",")})`);
        params.push(...provList);
      }
    }
    const values = await buildDistinctQuery("provinsi", conditions, params);
    res.json(values);
  } catch (err) {
    console.error("PUBLIC PROVINCES ERROR:", err);
    res.json([]);
  }
};

exports.getPublicCities = async (req, res) => {
  try {
    const { provinsi } = req.query || {};
    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];
    if (provinsi) {
      conditions.push("provinsi = ?");
      params.push(provinsi);
    }
    const values = await buildDistinctQuery("kota", conditions, params);
    res.json(values);
  } catch (err) {
    console.error("PUBLIC CITIES ERROR:", err);
    res.json([]);
  }
};

exports.getPublicDistricts = async (req, res) => {
  try {
    const { provinsi, kota } = req.query || {};
    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];
    if (provinsi) {
      conditions.push("provinsi = ?");
      params.push(provinsi);
    }
    if (kota) {
      conditions.push("kota = ?");
      params.push(kota);
    }
    const values = await buildDistinctQuery("kecamatan", conditions, params);
    res.json(values);
  } catch (err) {
    console.error("PUBLIC DISTRICTS ERROR:", err);
    res.json([]);
  }
};

exports.getPublicVillages = async (req, res) => {
  try {
    const { provinsi, kota, kecamatan } = req.query || {};
    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];
    if (provinsi) {
      conditions.push("provinsi = ?");
      params.push(provinsi);
    }
    if (kota) {
      conditions.push("kota = ?");
      params.push(kota);
    }
    if (kecamatan) {
      conditions.push("kecamatan = ?");
      params.push(kecamatan);
    }
    const values = await buildDistinctQuery("kelurahan", conditions, params);
    res.json(values);
  } catch (err) {
    console.error("PUBLIC VILLAGES ERROR:", err);
    res.json([]);
  }
};

exports.getPublicUsersSummary = async (req, res) => {
  try {
    const { pulau, provinsi, kota, kecamatan, kelurahan, minLat, maxLat, minLng, maxLng } = req.query || {};
    const conditions = ["role != 'admin'", "lat IS NOT NULL", "lng IS NOT NULL"];
    const params = [];

    if (pulau) {
      const provList = provincesByIsland(pulau);
      if (Array.isArray(provList) && provList.length) {
        conditions.push(`provinsi IN (${provList.map(() => "?").join(",")})`);
        params.push(...provList);
      }
    }
    if (provinsi) {
      conditions.push("provinsi = ?");
      params.push(provinsi);
    }
    if (kota) {
      conditions.push("kota = ?");
      params.push(kota);
    }
    if (kecamatan) {
      conditions.push("kecamatan = ?");
      params.push(kecamatan);
    }
    if (kelurahan) {
      conditions.push("kelurahan = ?");
      params.push(kelurahan);
    }
    if (minLat != null && maxLat != null) {
      conditions.push("lat BETWEEN ? AND ?");
      params.push(Number(minLat), Number(maxLat));
    }
    if (minLng != null && maxLng != null) {
      conditions.push("lng BETWEEN ? AND ?");
      params.push(Number(minLng), Number(maxLng));
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await db.query(
      `
      SELECT id, kemitraan
      FROM users
      ${where}
      `,
      params,
    );

    const categoryCount = {};
    for (const r of rows) {
      const list = String(r.kemitraan || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const cat of list) {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    }

    res.json({
      total: rows.length,
      categoryCount,
    });
  } catch (err) {
    console.error("PUBLIC USERS SUMMARY ERROR:", err);
    res.json({ total: 0, categoryCount: {} });
  }
};

exports.getPublicUserById = async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      `SELECT 
        id,
        nama,
        alamat,
        kelurahan,
        kecamatan,
        kota,
        provinsi,
        kode_pos,
        kemitraan,
        lat,
        lng,
        profile_picture,
        photos
       FROM users
       WHERE id = ? AND role != 'admin'`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Mitra tidak ditemukan" });
    }

    const mitra = rows[0];
    if (mitra.photos && typeof mitra.photos === "string") {
      try {
        mitra.photos = JSON.parse(mitra.photos);
      } catch {
        mitra.photos = [];
      }
    }
    if (!Array.isArray(mitra.photos)) mitra.photos = [];

    res.json(mitra);
  } catch (err) {
    console.error("PUBLIC USER BY ID ERROR:", err);
    const payload = { message: "Server error" };
    if (process.env.NODE_ENV !== "production") payload.error = err.message;
    res.status(500).json(payload);
  }
};
