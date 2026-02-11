const db = require("../config/db");
const { deleteUploadedFile } = require("../utils/deleteUploadedFile");

// ADMIN: list by type
exports.adminList = async (req, res) => {
  try {
    const type = req.params.type;
    const [rows] = await db.query(
      `SELECT id, type, title, subtitle, body, image, href, sort_order, is_active
       FROM cms_contents
       WHERE type = ?
       ORDER BY sort_order, id`,
      [type],
    );
    res.json(rows);
  } catch (err) {
    console.error("CMS ADMIN LIST ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: create
exports.adminCreate = async (req, res) => {
  try {
    const type = req.params.type;
    const { title, subtitle, body, image, href, sort_order, is_active } =
      req.body;

    if (!title) {
      return res.status(400).json({ message: "Title wajib diisi" });
    }

    const fileImage = req.file
      ? `/public/cms/${req.file.filename}`
      : image || null;

    await db.query(
      `INSERT INTO cms_contents (type, title, subtitle, body, image, href, sort_order, is_active)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        type,
        title,
        subtitle || null,
        body || null,
        fileImage,
        href || null,
        Number.isFinite(Number(sort_order)) ? Number(sort_order) : 0,
        is_active === "0" || is_active === 0 || is_active === false ? 0 : 1,
      ],
    );

    res.status(201).json({ message: "Konten berhasil ditambahkan" });
  } catch (err) {
    console.error("CMS ADMIN CREATE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: update
exports.adminUpdate = async (req, res) => {
  try {
    const type = req.params.type;
    const id = req.params.id;
    const { title, subtitle, body, image, href, sort_order, is_active } =
      req.body;

    const [rows] = await db.query(
      `SELECT id, type, title, subtitle, body, image, href, sort_order, is_active
       FROM cms_contents WHERE id = ? AND type = ?`,
      [id, type],
    );
    if (!rows.length) {
      return res.status(404).json({ message: "Konten tidak ditemukan" });
    }
    const current = rows[0];

    let newImage = current.image;
    if (req.file) {
      // delete old local image if any
      deleteUploadedFile(current.image);
      newImage = `/public/cms/${req.file.filename}`;
    } else if (image !== undefined) {
      newImage = image || null;
    }

    await db.query(
      `UPDATE cms_contents
       SET title = ?, subtitle = ?, body = ?, image = ?, href = ?, sort_order = ?, is_active = ?
       WHERE id = ? AND type = ?`,
      [
        title ?? current.title,
        subtitle ?? current.subtitle,
        body ?? current.body,
        newImage,
        href ?? current.href,
        sort_order != null ? Number(sort_order) : current.sort_order,
        is_active != null
          ? is_active === "0" || is_active === 0 || is_active === false
            ? 0
            : 1
          : current.is_active,
        id,
        type,
      ],
    );

    res.json({ message: "Konten berhasil diupdate" });
  } catch (err) {
    console.error("CMS ADMIN UPDATE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN: delete
exports.adminDelete = async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await db.query(
      "SELECT image FROM cms_contents WHERE id = ?",
      [id],
    );
    const current = rows[0];

    const [result] = await db.query("DELETE FROM cms_contents WHERE id = ?", [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Konten tidak ditemukan" });
    }
    if (current?.image) {
      deleteUploadedFile(current.image);
    }
    res.json({ message: "Konten berhasil dihapus" });
  } catch (err) {
    console.error("CMS ADMIN DELETE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUBLIC: list active content by type
exports.publicList = async (req, res) => {
  try {
    const type = req.params.type;
    const [rows] = await db.query(
      `SELECT id, type, title, subtitle, body, image, href, sort_order
       FROM cms_contents
       WHERE type = ? AND is_active = 1
       ORDER BY sort_order, id`,
      [type],
    );
    return res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error("CMS PUBLIC LIST ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  }
};

