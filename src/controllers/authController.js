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
      "SELECT id, nama, email, password, role, kemitraan, profile_picture, admin_permissions, csro_phone FROM users WHERE email = ?",
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

    let permissions = [];
    if (user.role === "admin") {
      try {
        if (Array.isArray(user.admin_permissions)) {
          permissions = user.admin_permissions;
        } else if (
          typeof user.admin_permissions === "string" &&
          user.admin_permissions.trim() !== ""
        ) {
          permissions = JSON.parse(user.admin_permissions);
        }
      } catch (e) {
        console.error("LOGIN: failed to parse admin_permissions for user", user.id, e.message);
        permissions = [];
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        kemitraan: user.kemitraan || null,
        permissions,
      },
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
        csro_phone: user.csro_phone || null,
        permissions,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Login gagal. Coba lagi atau periksa koneksi." });
    }
  }
};
