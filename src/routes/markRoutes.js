const express = require("express");

const authController = require("./../controllers/authController");
const mapController = require("./../controllers/mapController");

const router = express.Router();

router.patch("/:markId", authController.protect, mapController.editMark);

router.delete("/:markId", authController.protect, mapController.deleteMark);

module.exports = router;
