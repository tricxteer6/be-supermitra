const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const cmsController = require("../controllers/cmsController");

// Wrap handlers so any uncaught error returns 200 + [] (avoids 500 for map/content)
const safeJsonList = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error("PUBLIC ROUTE ERROR:", err);
    if (!res.headersSent) res.status(200).json([]);
  });
};

router.get("/users", safeJsonList(publicController.getPublicUsers));
router.get("/users/:id", publicController.getPublicUserById);

// Public locations (distinct)
router.get("/locations/provinsi", publicController.getPublicProvinces);
router.get("/locations/kota", publicController.getPublicCities);
router.get("/locations/kecamatan", publicController.getPublicDistricts);
router.get("/locations/kelurahan", publicController.getPublicVillages);

// Public CMS content
router.get("/content/:type", safeJsonList(cmsController.publicList));

module.exports = router;
