const express = require("express");

const testController = require("./../controllers/testController");

const router = express.Router();

router.post("/", testController.postArray);
router.get("/", testController.getArray);
router.put("/");

module.exports = router;
