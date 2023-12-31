const express = require("express");

const authController = require("./../controllers/authController");
const templateController = require("./../controllers/templateController");

const router = express.Router();

router.post("/", authController.protect, templateController.createTemplate);
router.patch(
  "/:templateId",
  authController.protect,
  templateController.editTemplate
);
router.get("/", authController.protect, templateController.getTemplate)

module.exports = router;
