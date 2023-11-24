const express = require("express");

const authController = require("./../controllers/authController");
const categoryController = require("./../controllers/categoryController");

const router = express.Router();

router.put("/:entryId", authController.protect, categoryController.editedEntry);

module.exports = router;
