const db = require("../config/db");

// GET ALL COURSES (Menampilkan semua termasuk VIP agar bisa muncul di Home)
exports.getCourses = async (req, res) => {
  try {
    const sql = `
  SELECT 
    id, 
    title, 
    description, 
    image, 
    instructor, 
    CASE 
      WHEN duration = 0 THEN NULL
      ELSE duration
    END AS duration,
    category, 
    embed_url, 
    is_vip AS isVip 
  FROM courses
`;

    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error("GET COURSES ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET COURSE DETAIL (Proteksi akses detail video)
exports.getCourseById = async (req, res) => {
  try {
    const role = req.user?.role || "user";

    const sql = `
  SELECT
    id,
    title,
    description,
    image,
    instructor,
    CASE 
      WHEN duration = 0 THEN NULL
      ELSE duration
    END AS duration,
    category,
    embed_url,
    is_vip AS isVip
  FROM courses
  WHERE id = ?
`;

    const [rows] = await db.query(sql, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = rows[0];

    // Logika Keamanan: Jika konten VIP dibuka oleh User biasa via URL manual
    if (course.isVip && role !== "admin" && role !== "vip") {
      return res.status(403).json({
        message: "Konten ini khusus member VIP",
        isLocked: true,
      });
    }

    res.json(course);
  } catch (err) {
    console.error("GET COURSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN CREATE
exports.createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      duration,
      category,
      embed_url,
      is_vip,
    } = req.body;

    const imagePath = req.file ? `/public/course/${req.file.filename}` : null;

    // Konversi is_vip ke 1 atau 0
    const isVipValue =
      is_vip === "true" || is_vip === 1 || is_vip === true ? 1 : 0;

    await db.query(
      `INSERT INTO courses (title, description, image, instructor, duration, category, embed_url, is_vip)
       VALUES (?,?,?,?,?,?,?,?)`,
      [
        title,
        description,
        imagePath,
        instructor,
        duration,
        category,
        embed_url,
        isVipValue,
      ],
    );

    res.json({ message: "Course created" });
  } catch (err) {
    console.error("CREATE COURSE ERROR:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ADMIN UPDATE
exports.updateCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      duration,
      category,
      embed_url,
      is_vip,
    } = req.body;

    const isVipValue =
      is_vip === "true" || is_vip === 1 || is_vip === true ? 1 : 0;

    let sql = `
      UPDATE courses SET
        title=?,
        description=?,
        instructor=?,
        duration=?,
        category=?,
        embed_url=?,
        is_vip=?
    `;

    const params = [
      title,
      description,
      instructor,
      duration,
      category,
      embed_url,
      isVipValue,
    ];

    if (req.file) {
      sql += ", image=?";
      params.push(`/public/course/${req.file.filename}`);
    }

    sql += " WHERE id=?";
    params.push(req.params.id);

    await db.query(sql, params);

    res.json({ message: "Course updated" });
  } catch (err) {
    console.error("UPDATE COURSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN DELETE
exports.deleteCourse = async (req, res) => {
  try {
    await db.query("DELETE FROM courses WHERE id=?", [req.params.id]);
    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error("DELETE COURSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
