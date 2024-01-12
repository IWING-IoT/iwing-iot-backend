const express = require("express");

const devicePhaseController = require("./../controllers/devicePhaseController");
const authController = require("./../controllers/authController");
const messageController = require("./../controllers/messageController");

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
  devicePhaseController.getDeviceFirmware
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

module.exports = router;
