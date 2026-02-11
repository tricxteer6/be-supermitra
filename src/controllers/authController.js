const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email dan password wajib diisi" });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!users.length)
      return res.status(400).json({ message: "Email not found" });

    const user = users[0];
    if (!user.password) {
      console.error("LOGIN: user has no password hash", user.id);
      return res.status(500).json({ message: "Login gagal. Akun bermasalah." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Wrong password" });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("LOGIN: JWT_SECRET is not set in .env");
      return res.status(500).json({ message: "Server belum dikonfigurasi. Set JWT_SECRET." });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, kemitraan: user.kemitraan || null },
      secret,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        nama: user.nama,
        role: user.role,
        kemitraan: user.kemitraan || null,
        profile_picture: user.profile_picture || null,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Login gagal. Coba lagi atau periksa koneksi." });
    }
  }
};
