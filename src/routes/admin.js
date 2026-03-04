const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const requirePermissions = require("../middleware/permissions");
const uploadProduct = require("../middleware/uploadProductImage");
const uploadCmsImage = require("../middleware/uploadCmsImage");
const {
  registerUser,
  deleteUser,
  getUsers,
  getUserById,
  updateUser,
  getCsroList,
} = require("../controllers/adminController");
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminProductController");
const cmsController = require("../controllers/cmsController");

// ADMIN ONLY - Users (permission: user:manage)
router.post(
  "/register",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  registerUser,
);
router.get(
  "/users",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getUsers,
);
router.get(
  "/user/:id",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getUserById,
);
router.put(
  "/user/:id",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  updateUser,
);
router.delete(
  "/user/:id",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  deleteUser,
);

// ADMIN ONLY - CSRO list (admin produk)
router.get(
  "/csro",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getCsroList,
);

// ADMIN ONLY - Products CRUD (permission: product:manage)
router.get(
  "/products",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  getAllProducts,
);
router.get(
  "/products/:id",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  getProductById,
);
router.post(
  "/products",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  uploadProduct.single("image"),
  createProduct,
);
router.put(
  "/products/:id",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  uploadProduct.single("image"),
  updateProduct,
);
router.delete(
  "/products/:id",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  deleteProduct,
);

// ADMIN ONLY - CMS content (permission: content:manage)
router.get(
  "/content/:type",
  auth,
  role(["admin"]),
  requirePermissions(["content:manage"]),
  cmsController.adminList,
);
router.post(
  "/content/:type",
  auth,
  role(["admin"]),
  requirePermissions(["content:manage"]),
  uploadCmsImage.single("image"),
  cmsController.adminCreate,
);
router.put(
  "/content/:type/:id",
  auth,
  role(["admin"]),
  requirePermissions(["content:manage"]),
  uploadCmsImage.single("image"),
  cmsController.adminUpdate,
);
router.delete(
  "/content/:id",
  auth,
  role(["admin"]),
  requirePermissions(["content:manage"]),
  cmsController.adminDelete,
);

module.exports = router;
