const express = require("express");

const authController = require("./../controllers/authController");
const phaseController = require("./../controllers/phaseController");
const phaseApiController = require("./../controllers/phaseApiController");

const router = express.Router();

router.patch(
  "/:phaseId/status",
  authController.protect,
  phaseController.phaseStatus
);

router.patch(
  "/:phaseId/deleted",
  authController.protect,
  phaseController.deleted
);

router.get("/:phaseId", authController.protect, phaseController.getInfo);

router.get(
  "/:phaseId/phaseApi",
  authController.protect,
  phaseApiController.getApi
);

router.post(
  "/:phaseId/phaseApi",
  authController.protect,
  phaseApiController.createApi
);

module.exports = router;
