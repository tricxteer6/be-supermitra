const db = require("../config/db");

// GET /api/user/me
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

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
        lng
       FROM users
       WHERE id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/user/me
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil data lama supaya field yang tidak diedit tetap aman
    const [rows] = await db.query(
      `SELECT 
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
       WHERE id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const current = rows[0];

    const {
      nama,
      email,
      alamat,
      kelurahan,
      kecamatan,
      kota,
      provinsi,
      kode_pos,
      lat,
      lng,
    } = req.body;

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
        kemitraan = ?,
        role = ?,
        lat = ?,
        lng = ?
       WHERE id = ?`,
      [
        nama ?? current.nama,
        email ?? current.email,
        alamat ?? current.alamat,
        kelurahan ?? current.kelurahan,
        kecamatan ?? current.kecamatan,
        kota ?? current.kota,
        provinsi ?? current.provinsi,
        kode_pos ?? current.kode_pos,
        current.kemitraan,
        current.role,
        lat != null ? Number(lat) : current.lat,
        lng != null ? Number(lng) : current.lng,
        userId,
      ],
    );

    res.json({ message: "Profil berhasil diupdate" });
  } catch (err) {
    console.error("UPDATE ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

