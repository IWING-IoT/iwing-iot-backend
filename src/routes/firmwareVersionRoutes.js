const express = require("express");

const authController = require("./../controllers/authController");
const firmwareController = require("./../controllers/firmwareController");

const router = express.Router();

router.delete(
  "/:firmwareVersionId",
  authController.protect,
  firmwareController.deleteVersion
);

router.patch(
  "/:firmwareVersionId",
  authController.protect,
  firmwareController.editVersion
);

router.get(
  "/:firmwareVersionId",
  authController.protect,
  firmwareController.getVersionDetail
);

module.exports = router;
