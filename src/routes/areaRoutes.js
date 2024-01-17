const express = require("express");

const authController = require("./../controllers/authController");
const mapController = require("./../controllers/mapController");

const router = express.Router();

router.get("/:areaId", authController.protect, mapController.getArea);

router.put("/:areaId", authController.protect, mapController.editArea);

router.delete("/:areaId", authController.protect, mapController.deleteArea);

module.exports = router;
