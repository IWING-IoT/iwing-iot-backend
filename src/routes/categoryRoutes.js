const express = require("express");

const authController = require("../controllers/authController");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

router.get(
  "/:categoryId",
  authController.protect,
  categoryController.getCategoryInfo
);

router.get(
  "/:categoryId/entry",
  authController.protect,
  categoryController.getEntryByCategory
);

router.post(
  "/:categoryId/entry",
  authController.protect,
  categoryController.addEntry
);
module.exports = router;
