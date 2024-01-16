const express = require("express");

const authController = require("./../controllers/authController");
const deviceFirmwareController = require("./../controllers/deviceFirmwareController");

const router = express.Router();

router.patch(
  "/:deviceFirmwareId",
  authController.protect,
  deviceFirmwareController.editDeviceFirmware
);

router.delete(
  "/:deviceFirmwareId",
  authController.protect,
  deviceFirmwareController.deleteDeviceFirmware
);

module.exports = router;
