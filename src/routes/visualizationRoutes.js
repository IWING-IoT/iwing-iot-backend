const express = require("express");

const visualizationController = require("./../controllers/visualizationController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.patch(
  "/:viualizationId",
  authController.protect,
  visualizationController.editDashboard
);

router.delete(
  "/:viualizationId",
  authController.protect,
  visualizationController.deleteDashboard
);

module.exports = router;
