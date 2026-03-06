const db = require("../config/db");
const bcrypt = require("bcryptjs");

// ======================
// HELPER: NORMALIZE PHONE (62xxxxxxxxxx)
// ======================
function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (!digits.startsWith("62")) return "62" + digits;
  return digits;
}

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
      phone,
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
      admin_permissions,
      csro_phone,
    } = req.body;

    const roleLower = String(role || "").toLowerCase();

    // ===== VALIDASI DASAR: nama, email, password, role selalu wajib =====
    if (!nama || !email || !password || !roleLower) {
      return res.status(400).json({
        message: "Nama, email, password, dan role wajib diisi",
      });
    }

    const isAdmin = roleLower === "admin";

    // ===== VALIDASI KHUSUS ADMIN =====
    if (isAdmin) {
      // Admin tidak wajib isi alamat/kemitraan/lokasi, tapi wajib punya minimal 1 permission
      let perms = [];
      if (Array.isArray(admin_permissions)) {
        perms = admin_permissions;
      } else if (typeof admin_permissions === "string" && admin_permissions.trim() !== "") {
        try {
          const parsed = JSON.parse(admin_permissions);
          if (Array.isArray(parsed)) perms = parsed;
        } catch {
          // biarkan kosong, akan ditolak di bawah
        }
      }
      if (!perms.length) {
        return res.status(400).json({
          message: "Admin wajib memiliki minimal satu hak akses",
        });
      }
    } else {
      // ===== VALIDASI KHUSUS NON-ADMIN (user/vip): alamat & kemitraan tetap wajib =====
      if (!alamat || !kemitraan) {
        return res.status(400).json({
          message: "Alamat dan kemitraan wajib diisi untuk user non-admin",
        });
      }
    }

    // ===== CEK EMAIL DUPLIKAT =====
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const hasLatLng = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

    // ===== CEK JARAK 500M (hanya jika lat/lng diisi dan BUKAN admin) =====
    if (!isAdmin && hasLatLng) {
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
    }

    // ===== HASH PASSWORD =====
    const hashedPassword = await bcrypt.hash(password, 10);

    const phoneNormalized = phone ? normalizePhone(phone) : null;

    // Use empty string for address columns when null so DBs with NOT NULL on these columns accept the insert
    const str = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : "");
    const kelurahanVal = str(kelurahan);
    const kecamatanVal = str(kecamatan);
    const kotaVal = str(kota);
    const provinsiVal = str(provinsi);
    const kodePosVal = str(kode_pos);

    // When lat/lng not provided, use 0,0 if DB has NOT NULL (frontend can treat 0,0 as "no location")
    const latVal = hasLatLng ? Number(lat) : 0;
    const lngVal = hasLatLng ? Number(lng) : 0;

    // ===== NORMALIZE ADMIN PERMISSIONS (optional) =====
    let adminPermissionsValue = null;
    if (Array.isArray(admin_permissions)) {
      adminPermissionsValue = JSON.stringify(admin_permissions);
    } else if (typeof admin_permissions === "string" && admin_permissions.trim() !== "") {
      try {
        const parsed = JSON.parse(admin_permissions);
        adminPermissionsValue = Array.isArray(parsed) ? JSON.stringify(parsed) : null;
      } catch {
        adminPermissionsValue = null;
      }
    }

    // ===== INSERT USER =====
    await db.query(
      `INSERT INTO users 
      (nama, email, password, phone, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos, kemitraan, role, lat, lng, admin_permissions, csro_phone)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        nama,
        email,
        hashedPassword,
        phoneNormalized,
        alamat || "",
        kelurahanVal,
        kecamatanVal,
        kotaVal,
        provinsiVal,
        kodePosVal,
        kemitraan || "DCC",
        role || "user",
        latVal,
        lngVal,
        adminPermissionsValue,
        csro_phone || null,
      ]
    );

    res.json({ message: "User berhasil didaftarkan" });
  } catch (err) {
    console.error("REGISTER USER ERROR:", err);
    const message = err.code === "ER_BAD_FIELD_ERROR" || err.message?.includes("Unknown column")
      ? `Database schema error: ${err.message}. Pastikan tabel users punya kolom 'phone' dan 'admin_permissions'. Contoh: ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL AFTER email; ALTER TABLE users ADD COLUMN admin_permissions JSON NULL AFTER role;`
      : (err.message || "Server error");
    res.status(500).json({ message });
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
      phone,
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
      admin_permissions,
      csro_phone,
    } = req.body;

    const { id } = req.params;

    // ===== VALIDASI ID =====
    if (!id) {
      return res.status(400).json({ message: "ID user tidak valid" });
    }

    const phoneNormalized = phone != null && String(phone).trim() !== "" ? normalizePhone(phone) : null;

    let adminPermissionsValue = null;
    if (Array.isArray(admin_permissions)) {
      adminPermissionsValue = JSON.stringify(admin_permissions);
    } else if (typeof admin_permissions === "string" && admin_permissions.trim() !== "") {
      try {
        const parsed = JSON.parse(admin_permissions);
        adminPermissionsValue = Array.isArray(parsed) ? JSON.stringify(parsed) : null;
      } catch {
        adminPermissionsValue = null;
      }
    }

    // ===== UPDATE =====
    await db.query(
      `UPDATE users SET
        nama = ?,
        email = ?,
        phone = ?,
        alamat = ?,
        kelurahan = ?,
        kecamatan = ?,
        kota = ?,
        provinsi = ?,
        kode_pos = ?,
        role = ?,
        kemitraan = ?,
        lat = ?,
        lng = ?,
        admin_permissions = ?,
        csro_phone = ?
       WHERE id = ?`,
      [
        nama,
        email,
        phoneNormalized,
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
        adminPermissionsValue,
        csro_phone || null,
        id,
      ]
    );

    // Kembalikan data user lengkap agar form tetap terisi setelah simpan
    const [rows] = await db.query(
      `SELECT id, nama, email, phone, alamat, kelurahan, kecamatan, kota, provinsi, kode_pos, kemitraan, role, lat, lng, profile_picture, photos, admin_permissions, csro_phone FROM users WHERE id = ?`,
      [id]
    );
    const user = rows[0];
    if (user) {
      if (user.photos != null && typeof user.photos === "string") {
        try {
          user.photos = JSON.parse(user.photos);
        } catch {
          user.photos = [];
        }
      }
      if (!Array.isArray(user.photos)) user.photos = user.photos ?? [];
      if (user.admin_permissions != null && typeof user.admin_permissions === "string") {
        try {
          user.admin_permissions = JSON.parse(user.admin_permissions);
        } catch {
          user.admin_permissions = null;
        }
      }
      return res.json(user);
    }
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
// ADMIN SET USER PASSWORD (superadmin / user:manage)
// ======================
exports.setUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({
        message: "Password baru wajib diisi",
      });
    }

    const trimmed = newPassword.trim();
    if (trimmed.length < 6) {
      return res.status(400).json({
        message: "Password baru minimal 6 karakter",
      });
    }

    const [rows] = await db.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!rows.length) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const hashed = await bcrypt.hash(trimmed, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, id]);

    res.json({ message: "Password user berhasil diubah" });
  } catch (err) {
    console.error("ADMIN SET USER PASSWORD ERROR:", err);
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
        phone,
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
        photos,
        admin_permissions,
        csro_phone
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

    if (user.admin_permissions != null && typeof user.admin_permissions === "string") {
      try {
        user.admin_permissions = JSON.parse(user.admin_permissions);
      } catch {
        user.admin_permissions = null;
      }
    }
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
        phone,
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
        admin_permissions,
        csro_phone
      FROM users
      ORDER BY id DESC
    `);

    const normalized = users.map((u) => {
      let parsedPerms = u.admin_permissions;
      if (u.admin_permissions != null && typeof u.admin_permissions === "string") {
        try {
          parsedPerms = JSON.parse(u.admin_permissions);
        } catch {
          parsedPerms = null;
        }
      }
      return {
        ...u,
        admin_permissions: parsedPerms,
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// ADMIN: LIST CSRO CANDIDATES (admin produk)
// ======================
exports.getCsroList = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        id,
        nama,
        email,
        phone,
        kemitraan,
        role,
        admin_permissions
      FROM users
      WHERE role = 'admin'`
    );

    const list = rows
      .map((u) => {
        let perms = u.admin_permissions;
        if (perms != null && typeof perms === "string") {
          try {
            perms = JSON.parse(perms);
          } catch {
            perms = null;
          }
        }
        const arr = Array.isArray(perms) ? perms : [];
        const hasProductManage = arr.includes("product:manage");
        const isFullAdmin = !arr.length; // admin lama tanpa admin_permissions dianggap full-access
        if (!hasProductManage && !isFullAdmin) return null;
        return {
          id: u.id,
          nama: u.nama,
          email: u.email,
          phone: u.phone,
          kemitraan: u.kemitraan,
        };
      })
      .filter(Boolean);

    res.json(list);
  } catch (err) {
    console.error("GET CSRO LIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
