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
  setUserPassword,
  getCsroList,
} = require("../controllers/adminController");
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/adminProductController");
const {
  getOrders,
  acceptOrder,
  rejectOrder,
  deleteOrder,
  getOrderLocationStats,
} = require("../controllers/adminOrderController");
const {
  getLocationRequests,
  getLocationRequestsCount,
  acceptLocationRequest,
  rejectLocationRequest,
} = require("../controllers/adminLocationRequestController");
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
router.put(
  "/user/:id/password",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  setUserPassword,
);

// ADMIN ONLY - CSRO list (admin produk)
router.get(
  "/csro",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getCsroList,
);

// ADMIN ONLY - Permintaan ubah lokasi mitra (user:manage)
router.get(
  "/location-requests",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getLocationRequests,
);
router.get(
  "/location-requests/count",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  getLocationRequestsCount,
);
router.patch(
  "/location-requests/:id/accept",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  acceptLocationRequest,
);
router.patch(
  "/location-requests/:id/reject",
  auth,
  role(["admin"]),
  requirePermissions(["user:manage"]),
  rejectLocationRequest,
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

// ADMIN ONLY - Orders (permission: product:manage)
router.get(
  "/orders",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  getOrders,
);
router.patch(
  "/orders/:id/accept",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  acceptOrder,
);
router.patch(
  "/orders/:id/reject",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  rejectOrder,
);

router.delete(
  "/orders/:id",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  deleteOrder,
);

router.get(
  "/orders/location-stats",
  auth,
  role(["admin"]),
  requirePermissions(["product:manage"]),
  getOrderLocationStats,
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
