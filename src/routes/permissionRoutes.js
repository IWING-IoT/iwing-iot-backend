const express = require("express");

const permissionController = require("./../controllers/permissionController");

const router = express.Router();

router.post("/", permissionController.createPermission);

module.exports = router;
