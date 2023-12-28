const express = require("express");

const authController = require("./../controllers/authController");
const messageIoTController = require("./../controllers/messageIoTController");
const messageController = require("./../controllers/messageController");

const router = express.Router();

router.post("/standalone", messageIoTController.createStandalone);

router.post("/gateway", messageIoTController.createGateway);

router.get(
  "/:messageId",
  authController.protect,
  messageController.getMessageDetail
);

module.exports = router;
