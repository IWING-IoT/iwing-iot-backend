const express = require("express");

const authController = require("./../controllers/authController");
const firmwareController = require("./../controllers/firmwareController");

const router = express.Router();

router.get("/", authController.protect, firmwareController.getFirmware);

router.post("/", authController.protect, firmwareController.createFirmware);

router.post(
  "/:firmwareId",
  authController.protect,
  firmwareController.createVersion
);

router.delete(
  "/:firmwareId",
  authController.protect,
  firmwareController.deleteFirmware
);

router.patch(
  "/firmware/:firmwareId",
  authController.protect,
  firmwareController.editFirmware
);

module.exports = router;
