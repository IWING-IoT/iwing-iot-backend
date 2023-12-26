const express = require("express");

const authController = require("./../controllers/authController");
const phaseController = require("./../controllers/phaseController");
const phaseApiController = require("./../controllers/phaseApiController");
const devicePhaseController = require("./../controllers/devicePhaseController");

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


// PhaseApi API
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

router.get(
  "/:phaseId/phaseApi/example",
  authController.protect,
  phaseApiController.example
);

router.post(
  "/:phaseId/phaseApi/copy",
  authController.protect,
  phaseApiController.copy
);


// Device API
router.post(
  "/:phaseId/device",
  authController.protect,
  devicePhaseController.addDevice
);

router.get(
  "/:phaseId/device",
  authController.protect,
  devicePhaseController.getDevice
);

module.exports = router;
