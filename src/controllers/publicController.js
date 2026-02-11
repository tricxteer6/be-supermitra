const db = require("../config/db");

exports.getPublicUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        id,
        nama,
        kota,
        provinsi,
        kemitraan,
        lat,
        lng,
        profile_picture
      FROM users
      WHERE 
        role != 'admin'
        AND lat IS NOT NULL
        AND lng IS NOT NULL
    `);

    res.json(users);
  } catch (err) {
    console.error("PUBLIC USERS ERROR:", err);
    const payload = { message: "Server error" };
    if (process.env.NODE_ENV !== "production") payload.error = err.message;
    res.status(500).json(payload);
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
