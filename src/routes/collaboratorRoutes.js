const express = require("express");

const collaboratorController = require("./../controllers/collaboratorController");
const authController = require("./../controllers/authController");

const router = express.Router();

router.patch(
  "/:collaboratorId",
  authController.protect,
  collaboratorController.editCollaborator
);

router.delete(
  "/:collaboratorId",
  authController.protect,
  collaboratorController.deleteCollaborator
);

router.patch(
  "/:collaboratorId/transferOwner",
  authController.protect,
  collaboratorController.transferOwner
);

module.exports = router;
