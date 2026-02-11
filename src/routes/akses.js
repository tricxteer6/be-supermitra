const router = require("express").Router();
const auth = require("../middleware/auth");
const {
  getCourses,
  getCourseById,
} = require("../controllers/courseController");
const {
  getProducts,
  getProductById,
} = require("../controllers/productController");
const { createOrder } = require("../controllers/orderController");

// Course (same logic as /api/course, under /api/akses)
router.get("/courses", auth, getCourses);
router.get("/courses/:id", auth, getCourseById);

// Products
router.get("/products", auth, getProducts);
router.get("/products/:id", auth, getProductById);

// Orders
router.post("/orders", auth, createOrder);

module.exports = router;
