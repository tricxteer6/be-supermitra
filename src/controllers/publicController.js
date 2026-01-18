const db = require("../config/db");

exports.getPublicUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        nama,
        kota,
        provinsi,
        kemitraan,
        lat,
        lng
      FROM users
      WHERE role != 'admin'
        AND lat IS NOT NULL
        AND lng IS NOT NULL
    `);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
