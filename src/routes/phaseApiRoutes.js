const express = require("express");

const authController = require("./../controllers/authController");
const phaseApiController = require("./../controllers/phaseApiController");

const router = express.Router();

router.patch("/:phaseApiId", authController.protect, phaseApiController.edited);

router.delete(
  "/:phaseApiId",
  authController.protect,
  phaseApiController.deleted
);

module.exports = router;
