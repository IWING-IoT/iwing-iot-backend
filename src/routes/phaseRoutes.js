const express = require("express");

const authController = require("./../controllers/authController");
const phaseController = require("./../controllers/phaseController");
const phaseApiController = require("./../controllers/phaseApiController");
const devicePhaseController = require("./../controllers/devicePhaseController");
const mapController = require("./../controllers/mapController");
const visualizationController = require("./../controllers/visualizationController");

const router = express.Router();

router.patch(
  "/:phaseId/status",
  authController.protect,
  phaseController.phaseStatus
);

router.patch("/:phaseId", authController.protect, phaseController.editPhase);

router.delete("/:phaseId", authController.protect, phaseController.deleted);

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

// Map API
router.get(
  "/:phaseId/map/position",
  authController.protect,
  mapController.getMapPosition
);

router.get(
  "/:phaseId/map/path",
  authController.protect,
  mapController.getMapPath
);

router.get("/:phaseId/area", authController.protect, mapController.getMapAreas);

router.post("/:phaseId/area", authController.protect, mapController.createArea);

// CSV api
router.get(
  "/:phaseId/csv",
  authController.protect,
  phaseController.downloadCsv
);

// Mark api
router.get(
  "/:phaseId/map/mark",
  authController.protect,
  mapController.getMarks
);

router.post(
  "/:phaseId/map/mark",
  authController.protect,
  mapController.createMark
);

// Dashboard api
router.get(
  "/:phaseId/dashboard",
  authController.protect,
  visualizationController.getDashboard
);

router.post(
  "/:phaseId/dashboard",
  authController.protect,
  visualizationController.createDashboard
);

router.put(
  "/:phaseId/dashboard",
  authController.protect,
  visualizationController.editLayout
);

router.get(
  "/:phaseId/visualization/device",
  authController.protect,
  visualizationController.getDeviceVisualization
);

router.get(
  "/:phaseId/visualization/battery",
  authController.protect,
  visualizationController.getBatteryVisualization
);

router.get(
  "/:phaseId/visualization/lastConnection",
  authController.protect,
  visualizationController.getLastConnectionVisualization
);

module.exports = router;
