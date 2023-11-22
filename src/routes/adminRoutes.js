const express = require("express");
const adminController = require("./../controllers/adminController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.post(
  "/account",
  authController.protect,
  authController.restrictTo("admin"),
  adminController.addUser
);
// router.post("/account", adminController.addUser);

module.exports = router;
