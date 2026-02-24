const db = require("../config/db");
const { deleteUploadedFile } = require("../utils/deleteUploadedFile");
const bcrypt = require("bcryptjs");

// GET /api/user/me
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;

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
        photos
       FROM users
       WHERE id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const user = rows[0];
    if (user.photos && typeof user.photos === "string") {
      try {
        user.photos = JSON.parse(user.photos);
      } catch {
        user.photos = [];
      }
    }
    if (!Array.isArray(user.photos)) user.photos = [];

    res.json(user);
  } catch (err) {
    console.error("GET ME ERROR:", err);
    if (!res.headersSent) res.status(401).json({ message: "Sesi bermasalah. Silakan login lagi." });
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
        lng,
        profile_picture,
        photos
       FROM users
       WHERE id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const current = rows[0];
    let currentPhotos = [];
    if (current.photos && typeof current.photos === "string") {
      try {
        currentPhotos = JSON.parse(current.photos);
      } catch {}
    } else if (Array.isArray(current.photos)) currentPhotos = current.photos;

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
      profile_picture,
      photos,
    } = req.body;

    let photosPayload = currentPhotos;
    if (photos !== undefined) {
      photosPayload = Array.isArray(photos) ? photos : currentPhotos;
    }

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
        lng = ?,
        profile_picture = ?,
        photos = ?
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
        profile_picture !== undefined ? profile_picture : current.profile_picture,
        JSON.stringify(photosPayload),
        userId,
      ],
    );

    res.json({ message: "Profil berhasil diupdate" });
  } catch (err) {
    console.error("UPDATE ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/user/me/avatar - upload profile picture (single file)
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ message: "Tidak ada file gambar" });
    }
    const [rows] = await db.query(
      "SELECT profile_picture FROM users WHERE id = ?",
      [userId],
    );
    const oldPicture = rows.length ? rows[0].profile_picture : null;
    const profilePicture = `/public/profile/${req.file.filename}`;
    await db.query(
      "UPDATE users SET profile_picture = ? WHERE id = ?",
      [profilePicture, userId],
    );
    deleteUploadedFile(oldPicture);
    res.json({ profile_picture: profilePicture });
  } catch (err) {
    console.error("UPLOAD AVATAR ERROR:", err);
    const message =
      err.code === "ER_BAD_FIELD_ERROR"
        ? "Kolom profile_picture belum ada. Jalankan: node migrations/run-add-profile-photos.js"
        : "Gagal mengunggah foto profil";
    res.status(500).json({ message });
  }
};

// POST /api/user/me/photos - upload gallery photos (multiple files)
exports.uploadPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: "Tidak ada file gambar" });
    }
    const newPaths = files.map((f) => `/public/mitra-photos/${f.filename}`);
    const [rows] = await db.query(
      "SELECT photos FROM users WHERE id = ?",
      [userId],
    );
    let photos = [];
    if (rows.length && rows[0].photos && typeof rows[0].photos === "string") {
      try {
        photos = JSON.parse(rows[0].photos);
      } catch {}
    } else if (rows.length && Array.isArray(rows[0].photos)) {
      photos = rows[0].photos;
    }
    photos = [...photos, ...newPaths].slice(-20); // keep max 20
    await db.query("UPDATE users SET photos = ? WHERE id = ?", [
      JSON.stringify(photos),
      userId,
    ]);
    res.json({ photos });
  } catch (err) {
    console.error("UPLOAD PHOTOS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/user/me/photos - remove one photo from gallery by index or path
exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const { index, path: photoPath } = req.body;
    const [rows] = await db.query(
      "SELECT photos FROM users WHERE id = ?",
      [userId],
    );
    let photos = [];
    if (rows.length && rows[0].photos && typeof rows[0].photos === "string") {
      try {
        photos = JSON.parse(rows[0].photos);
      } catch {}
    } else if (rows.length && Array.isArray(rows[0].photos)) {
      photos = rows[0].photos;
    }
    let removedPath = null;
    if (typeof index === "number" && index >= 0 && index < photos.length) {
      removedPath = photos[index];
      photos.splice(index, 1);
    } else if (photoPath && typeof photoPath === "string") {
      removedPath = photoPath;
      photos = photos.filter((p) => p !== photoPath);
    } else {
      return res.status(400).json({ message: "Berikan index atau path foto" });
    }
    deleteUploadedFile(removedPath);
    await db.query("UPDATE users SET photos = ? WHERE id = ?", [
      JSON.stringify(photos),
      userId,
    ]);
    res.json({ photos });
  } catch (err) {
    console.error("DELETE PHOTO ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/user/me/password - change own password (current + new)
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Password lama dan password baru wajib diisi",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password baru minimal 6 karakter",
      });
    }

    const [rows] = await db.query(
      "SELECT password FROM users WHERE id = ?",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const storedHash = rows[0].password;
    if (!storedHash) {
      return res.status(400).json({
        message: "Akun ini belum punya password. Gunakan lupa password atau hubungi admin.",
      });
    }

    const match = await bcrypt.compare(currentPassword, storedHash);
    if (!match) {
      return res.status(400).json({ message: "Password lama salah" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      userId,
    ]);

    res.json({ message: "Password berhasil diubah" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Gagal mengubah password. Coba lagi." });
    }
  }
};

