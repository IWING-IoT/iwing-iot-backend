const express = require("express");

const devicePhaseController = require("./../controllers/devicePhaseController");
const deviceFirmwareController = require("./../controllers/deviceFirmwareController");
const authController = require("./../controllers/authController");
const messageController = require("./../controllers/messageController");
const visualizationController = require("./../controllers/visualizationController");

const router = express.Router();

router.patch(
  "/:devicePhaseId/status",
  authController.protect,
  devicePhaseController.deviceStatus
);

router.delete(
  "/:devicePhaseId",
  authController.protect,
  devicePhaseController.removeDevice
);

router.patch(
  "/:devicePhaseId/jwt",
  authController.protect,
  devicePhaseController.generateJwt
);

router.get(
  "/:devicePhaseId",
  authController.protect,
  devicePhaseController.getDeviceInfo
);

router.get(
  "/:devicePhaseId/stat",
  authController.protect,
  devicePhaseController.getDeviceStat
);

router.get(
  "/:devicePhaseId/firmware",
  authController.protect,
  deviceFirmwareController.getDeviceFirmware
);

router.post(
  "/:devicePhaseId/firmware",
  authController.protect,
  deviceFirmwareController.addFirmware
);

router.get(
  "/:devicePhaseId/firmware/firmwareLog",
  authController.protect,
  deviceFirmwareController.getDeviceFirmwareLog
);

router.put(
  "/:devicePhaseId",
  authController.protect,
  devicePhaseController.editDevice
);

router.get(
  "/:devicePhaseId/message",
  authController.protect,
  messageController.getMessageDevice
);

router.get(
  "/:devicePhaseId/gateway",
  authController.protect,
  devicePhaseController.getNodesGateway
);

// Visualization
router.get(
  "/:devicePhaseId/graph/summary",
  authController.protect,
  visualizationController.getDeviceGraphSummary
);

router.get(
  "/:devicePhaseId/graph/detail",
  authController.protect,
  visualizationController.getDeviceGraphDetail
);

module.exports = router;
