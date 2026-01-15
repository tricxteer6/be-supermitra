const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ======================
// HELPER: HITUNG JARAK (HAVERSINE)
// ======================
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

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
    if (!nama || !email || !password || !lat || !lng) {
      return res.status(400).json({
        message: "Nama, email, password, dan lokasi wajib diisi",
      });
    }

    // ===== CEK EMAIL DUPLIKAT =====
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Email sudah terdaftar",
      });
    }

    // ===== CEK JARAK 500M =====
    const [locations] = await db.query(
      "SELECT id, lat, lng FROM users WHERE lat IS NOT NULL AND lng IS NOT NULL"
    );

    for (let loc of locations) {
      const distance = getDistance(lat, lng, loc.lat, loc.lng);

      if (distance < 500) {
        return res.status(400).json({
          message: "Lokasi terlalu dekat dengan user lain (minimal 500 meter)",
        });
      }
    }

    // ===== HASH PASSWORD =====
    const hashed = await bcrypt.hash(password, 10);

    // ===== INSERT USER =====
    await db.query(
      `INSERT INTO users 
      (nama, email, password, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos, kemitraan, role, lat, lng)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nama,
        email,
        hashed,
        alamat || null,
        kelurahan || null,
        kecamatan || null,
        kota || null,
        provinsi || null,
        kode_pos || null,
        kemitraan,
        role,
        lat,
        lng,
      ]
    );

    res.json({ message: "User berhasil didaftarkan oleh admin" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN UPDATE USER (+ LOKASI)
// ======================
exports.updateUser = async (req, res) => {
  try {
    const { nama, email, role, kemitraan, lat, lng } = req.body;
    const { id } = req.params;

    // ===== CEK JARAK 500M (KECUALI DIRI SENDIRI) =====
    if (lat && lng) {
      const [locations] = await db.query(
        "SELECT id, lat, lng FROM users WHERE lat IS NOT NULL AND lng IS NOT NULL AND id != ?",
        [id]
      );

      for (let loc of locations) {
        const distance = getDistance(lat, lng, loc.lat, loc.lng);

        if (distance < 500) {
          return res.status(400).json({
            message:
              "Lokasi terlalu dekat dengan user lain (minimal 500 meter)",
          });
        }
      }
    }

    await db.query(
      `UPDATE users 
       SET nama=?, email=?, role=?, kemitraan=?, lat=?, lng=? 
       WHERE id=?`,
      [nama, email, role, kemitraan, lat, lng, id]
    );

    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN DELETE USER
// ======================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM users WHERE id=?", [id]);

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN GET ALL USERS (+ LOKASI)
// ======================
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, nama, email, alamat, kemitraan, role, lat, lng FROM users"
    );

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
