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
        lng
      FROM users
      WHERE 
        role != 'admin'
        AND lat IS NOT NULL
        AND lng IS NOT NULL
    `);

    res.json(users);
  } catch (err) {
    console.error("PUBLIC USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
