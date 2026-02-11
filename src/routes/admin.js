const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const uploadProduct = require("../middleware/uploadProductImage");
const uploadCmsImage = require("../middleware/uploadCmsImage");
const {
  registerUser,
  deleteUser,
  getUsers,
  updateUser,
} = require("../controllers/adminController");
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminProductController");
const cmsController = require("../controllers/cmsController");

// ADMIN ONLY - Users
router.post("/register", auth, role(["admin"]), registerUser);
router.delete("/user/:id", auth, role(["admin"]), deleteUser);
router.get("/users", auth, role(["admin"]), getUsers);
router.put("/user/:id", auth, role(["admin"]), updateUser);

// ADMIN ONLY - Products CRUD
router.get("/products", auth, role(["admin"]), getAllProducts);
router.get("/products/:id", auth, role(["admin"]), getProductById);
router.post(
  "/products",
  auth,
  role(["admin"]),
  uploadProduct.single("image"),
  createProduct,
);
router.put(
  "/products/:id",
  auth,
  role(["admin"]),
  uploadProduct.single("image"),
  updateProduct,
);
router.delete("/products/:id", auth, role(["admin"]), deleteProduct);

// ADMIN ONLY - CMS content
router.get(
  "/content/:type",
  auth,
  role(["admin"]),
  cmsController.adminList,
);
router.post(
  "/content/:type",
  auth,
  role(["admin"]),
  uploadCmsImage.single("image"),
  cmsController.adminCreate,
);
router.put(
  "/content/:type/:id",
  auth,
  role(["admin"]),
  uploadCmsImage.single("image"),
  cmsController.adminUpdate,
);
router.delete(
  "/content/:id",
  auth,
  role(["admin"]),
  cmsController.adminDelete,
);

module.exports = router;
