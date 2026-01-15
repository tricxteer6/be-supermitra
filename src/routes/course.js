const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  getCourses,
  createCourse,
  deleteCourse,
  updateCourse
} = require("../controllers/courseController");

// USER / VIP / ADMIN
router.get("/", auth, require("../controllers/courseController").getCourses);

// ADMIN ONLY
router.post("/", auth, role(["admin"]), createCourse);
router.delete("/:id", auth, role(["admin"]), deleteCourse);
router.put("/:id", auth, role(["admin"]), updateCourse);

module.exports = router;
