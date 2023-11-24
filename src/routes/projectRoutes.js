const express = require("express");

const projectController = require("./../controllers/projectController");
const authController = require("./../controllers/authController");
const collaboratorController = require("./../controllers/collaboratorController");
const phaseController = require("./../controllers/phaseController");
const categoryController = require("./../controllers/categoryController");

const router = express.Router();

router.get("/", authController.protect, projectController.getProjects);
router.post("/", authController.protect, projectController.createProject);
router.get("/:projectId", authController.protect, projectController.getInfo);
router.patch(
  "/:projectId/archived",
  authController.protect,
  projectController.archived
);

router.patch(
  "/:projectId/deleted",
  authController.protect,
  projectController.deleted
);

router.patch("/:projectId", authController.protect, projectController.edited);

router.post(
  "/:projectId/collaborator",
  authController.protect,
  collaboratorController.createCollaborator
);

router.get(
  "/:projectId/collaborator",
  authController.protect,
  collaboratorController.getCollaborator
);

router.post(
  "/:projectId/phase",
  authController.protect,
  phaseController.createPhase
);

router.get(
  "/:projectId/phase",
  authController.protect,
  phaseController.getPhases
);

router.post(
  "/:projectId/category",
  authController.protect,
  categoryController.createCategory
);

router.get(
  "/:projectId/category",
  authController.protect,
  categoryController.getName
);

module.exports = router;
