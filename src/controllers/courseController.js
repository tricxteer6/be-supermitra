const db = require("../config/db");

exports.getCourses = async (req, res) => {
  const role = req.user.role;

  let sql = `
    SELECT 
      id,
      title,
      instructor,
      level,
      duration,
      category,
      embed_url,
      is_vip AS isVip
    FROM courses
  `;

  if (role === "user") {
    sql += " WHERE is_vip = 0";
  }

  const [rows] = await db.query(sql);
  res.json(rows);
};

// 🔒 ADMIN CREATE COURSE
exports.createCourse = async (req, res) => {
  try {
    const { title, instructor, level, duration, category, embed_url, is_vip } =
      req.body;

    await db.query(
      `INSERT INTO courses 
       (title, instructor, level, duration, category, embed_url, is_vip)
       VALUES (?,?,?,?,?,?,?)`,
      [title, instructor, level, duration, category, embed_url, is_vip ? 1 : 0]
    );

    res.json({ message: "Course created" });
  } catch (err) {
    console.error("CREATE COURSE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { title, instructor, level, duration, category, embed_url, is_vip } =
      req.body;

    await db.query(
      `UPDATE courses SET
        title=?,
        instructor=?,
        level=?,
        duration=?,
        category=?,
        embed_url=?,
        is_vip=?
       WHERE id=?`,
      [
        title,
        instructor,
        level,
        duration,
        category,
        embed_url,
        is_vip ? 1 : 0,
        req.params.id,
      ]
    );

    res.json({ message: "Course updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔒 ADMIN DELETE COURSE
exports.deleteCourse = async (req, res) => {
  await db.query("DELETE FROM courses WHERE id=?", [req.params.id]);
  res.json({ message: "Course deleted" });
};
