const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const {
  registerUser,
  deleteUser,
  getUsers,
  updateUser
} = require("../controllers/adminController");

// ADMIN ONLY
router.post("/register", auth, role(["admin"]), registerUser);
router.delete("/user/:id", auth, role(["admin"]), deleteUser);
router.get("/users", auth, role(["admin"]), getUsers);
router.put("/user/:id", auth, role(["admin"]), updateUser);

module.exports = router;
