const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (!digits.startsWith("62")) return "62" + digits;
  return digits;
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email/telepon dan password wajib diisi" });
    }

    const asEmail = String(email).trim();
    const rawDigits = String(email).replace(/\D/g, "");
    const normPhone = normalizePhone(email);

    // Kandidat nomor telepon yang mungkin tersimpan di DB
    const phoneCandidates = [];
    if (rawDigits) phoneCandidates.push(rawDigits);
    if (normPhone && normPhone !== rawDigits) phoneCandidates.push(normPhone);
    if (rawDigits.startsWith("62")) {
      const withZero = "0" + rawDigits.slice(2);
      if (withZero && !phoneCandidates.includes(withZero)) {
        phoneCandidates.push(withZero);
      }
    }

    // Lengkapi jadi 3 parameter untuk query
    while (phoneCandidates.length < 3) phoneCandidates.push(null);

    const [users] = await db.query(
      `SELECT id, nama, email, password, role, kemitraan, profile_picture, admin_permissions, csro_phone
       FROM users
       WHERE email = ?
          OR phone = ?
          OR phone = ?
          OR phone = ?
       LIMIT 1`,
      [asEmail, phoneCandidates[0], phoneCandidates[1], phoneCandidates[2]],
    );

    if (!users.length)
      return res.status(400).json({ message: "Akun tidak ditemukan (email/telepon salah)" });

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
