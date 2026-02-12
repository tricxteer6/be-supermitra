const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ======================
// HELPER: HITUNG JARAK (HAVERSINE)
// ======================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meter
  const φ1 = (Number(lat1) * Math.PI) / 180;
  const φ2 = (Number(lat2) * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ======================
// ADMIN REGISTER USER
// ======================
exports.registerUser = async (req, res) => {
  try {
    const {
      nama,
      email,
      password,
      alamat,
      kelurahan,
      kecamatan,
      kota,
      provinsi,
      kode_pos,
      kemitraan,
      role,
      lat,
      lng,
    } = req.body;

    // ===== VALIDASI =====
    if (!nama || !email || !password || lat == null || lng == null) {
      return res.status(400).json({
        message: "Nama, email, password, dan lokasi wajib diisi",
      });
    }

    // ===== CEK EMAIL DUPLIKAT =====
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    // ===== CEK JARAK 500M =====
    const [locations] = await db.query(
      "SELECT id, lat, lng FROM users WHERE lat IS NOT NULL AND lng IS NOT NULL"
    );

    for (const loc of locations) {
      const distance = getDistance(lat, lng, loc.lat, loc.lng);
      if (distance < 500) {
        return res.status(400).json({
          message: "Lokasi terlalu dekat dengan user lain (minimal 500 meter)",
        });
      }
    }

    // ===== HASH PASSWORD =====
    const hashedPassword = await bcrypt.hash(password, 10);

    // ===== INSERT USER =====
    await db.query(
      `INSERT INTO users 
      (nama, email, password, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos, kemitraan, role, lat, lng)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nama,
        email,
        hashedPassword,
        alamat || null,
        kelurahan || null,
        kecamatan || null,
        kota || null,
        provinsi || null,
        kode_pos || null,
        kemitraan || "DCC",
        role || "user",
        Number(lat),
        Number(lng),
      ]
    );

    res.json({ message: "User berhasil didaftarkan" });
  } catch (err) {
    console.error("REGISTER USER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN UPDATE USER
// ======================
exports.updateUser = async (req, res) => {
  try {
    const {
      nama,
      email,
      alamat,
      kelurahan,
      kecamatan,
      kota,
      provinsi,
      kode_pos,
      role,
      kemitraan,
      lat,
      lng,
    } = req.body;

    const { id } = req.params;

    // ===== VALIDASI ID =====
    if (!id) {
      return res.status(400).json({ message: "ID user tidak valid" });
    }

    // ===== UPDATE =====
    await db.query(
      `UPDATE users SET
        nama = ?,
        email = ?,
        alamat = ?,
        kelurahan = ?,
        kecamatan = ?,
        kota = ?,
        provinsi = ?,
        kode_pos = ?,
        role = ?,
        kemitraan = ?,
        lat = ?,
        lng = ?
       WHERE id = ?`,
      [
        nama,
        email,
        alamat || null,
        kelurahan || null,
        kecamatan || null,
        kota || null,
        provinsi || null,
        kode_pos || null,
        role,
        kemitraan,
        lat != null ? Number(lat) : null,
        lng != null ? Number(lng) : null,
        id,
      ]
    );

    res.json({ message: "User berhasil diupdate" });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN DELETE USER
// ======================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM users WHERE id = ?", [id]);

    res.json({ message: "User berhasil dihapus" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN GET USER BY ID
// ======================
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT 
        id,
        nama,
        email,
        alamat,
        kelurahan,
        kecamatan,
        kota,
        provinsi,
        kode_pos,
        kemitraan,
        role,
        lat,
        lng,
        profile_picture,
        photos
       FROM users
       WHERE id = ?`,
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    const user = rows[0];
    if (user.photos != null && typeof user.photos === "string") {
      try {
        user.photos = JSON.parse(user.photos);
      } catch {
        user.photos = [];
      }
    }
    if (!Array.isArray(user.photos)) user.photos = user.photos ?? [];
    res.json(user);
  } catch (err) {
    console.error("GET USER BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN GET ALL USERS
// ======================
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        id,
        nama,
        email,
        alamat,
        kelurahan,
        kecamatan,
        kota,
        provinsi,
        kode_pos,
        kemitraan,
        role,
        lat,
        lng
      FROM users
      ORDER BY id DESC
    `);

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
