const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");
const cmsController = require("../controllers/cmsController");

router.get("/users", publicController.getPublicUsers);
router.get("/users/:id", publicController.getPublicUserById);

// Public CMS content
router.get("/content/:type", cmsController.publicList);

module.exports = router;
