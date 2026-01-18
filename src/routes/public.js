const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

router.get("/users", publicController.getPublicUsers);

module.exports = router;
