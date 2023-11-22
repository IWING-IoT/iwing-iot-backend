const express = require("express");

const roleController = require("./../controllers/roleController");

const router = express.Router();

router.post("/", roleController.addRole);

module.exports = router;
