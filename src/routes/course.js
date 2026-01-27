const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const upload = require("../middleware/uploadCourseImage");

// USER / VIP / ADMIN
router.get("/", auth, getCourses);
router.get("/:id", auth, getCourseById);

// ADMIN ONLY (Hanya satu definisi per method)
// Ganti "image" menjadi "thumbnail" agar sinkron dengan AdminCourses.jsx
router.post(
  "/",
  auth,
  role(["admin"]),
  upload.single("thumbnail"),
  createCourse,
);

router.put(
  "/:id",
  auth,
  role(["admin"]),
  upload.single("thumbnail"),
  updateCourse,
);

router.delete("/:id", auth, role(["admin"]), deleteCourse);

module.exports = router;
