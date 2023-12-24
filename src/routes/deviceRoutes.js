const express = require("express");

const deviceController = require("./../controllers/deviceController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post("/", authController.protect, deviceController.createDevice);

router.get("/", authController.protect, deviceController.getDevices);

router.patch(
  "/:deviceId/disable",
  authController.protect,
  deviceController.disableDevice
);

router.patch("/:deviceId", authController.protect, deviceController.editDevice);

router.delete(
  "/:deviceId",
  authController.protect,
  deviceController.deleteDevice
);

module.exports = router;
