const express = require("express");

const authController = require("./../controllers/authController");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.put("/:entryId", authController.protect, categoryController.editEntry);

router.delete(
  "/:entryId",
  authController.protect,
  categoryController.deleteEntry
);


module.exports = router;
