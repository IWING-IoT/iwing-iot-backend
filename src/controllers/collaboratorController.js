const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

const Collaborator = require("./../models/collaboratorModel");
const Project = require("./../models/projectModel");
const Permission = require("./../models/permissionModel");
const User = require("./../models/userModel");

/**
 * @desc check wheather input id is valid mongodb objectID
 * @param {String} id that want to check
 * @return {Boolean} return true if inpur is valid mongodb;otherwise false
 */
const isValidObjectId = (id) => {
  if (mongoose.isValidObjectId(id)) return true;
  return false;
};

const compareId = (id1, id2) => {
  return id1.toString() === id2.toString();
};

// POST /api/project/:projectId/collaborator (finished)
exports.createCollaborator = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;
  const invalidCollaborator = [];

  await checkCollab(
    next,
    projectId,
    req.user.id,
    "You do not have permission to create a new collaboratoe.",
    "can_edit",
    "owner"
  );

  for (const collaborator of req.fields) {
    // Check if request has all required input
    if (
      !collaborator.email ||
      !collaborator.permission ||
      !isValidObjectId(projectId)
    ) {
      invalidCollaborator.push({
        email: collaborator.email,
        reason: "Invalid input",
      });
      continue;
    }

    if (collaborator.permission === "owner")
      invalidCollaborator.push({
        email: collaborator.email,
        reason: "Cannot not add owner permission",
      });

    const permission = await Permission.findOne({
      name: collaborator.permission,
    });
    if (!permission) {
      invalidCollaborator.push({
        email: collaborator.email,
        reason: "Permission needed not exist",
      });
      continue;
    }

    const collaboratorAccount = await User.findOne({
      email: collaborator.email,
    });
    if (!collaboratorAccount) {
      invalidCollaborator.push({
        email: collaborator.email,
        reason: "User not found",
      });
      continue;
    }

    const testCollaborator = await Collaborator.findOne({
      userId: collaboratorAccount._id,
      projectId,
    });

    if (testCollaborator) {
      invalidCollaborator.push({
        email: collaborator.email,
        reason: "Collaborator already exist",
      });
      continue;
    }

    const newCollaborator = await Collaborator.create({
      userId: collaboratorAccount._id,
      permissionId: permission._id,
      projectId,
      createdAt: Date.now(),
      createdBy: req.user._id,
      editedAt: Date.now(),
      editedBy: req.user._id,
    });
  }
  // Check wheather collaborator is valid
  res.status(201).json({
    invalidCollaborator,
  });
});

// PATCH /api/collaborator/:collaboratorId (finished)
exports.editCollaborator = catchAsync(async (req, res, next) => {
  const newPermission = req.fields;
  const collaboratorId = req.params.collaboratorId;

  if (!newPermission.permission)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        400
      )
    );

  if (!isValidObjectId(collaboratorId))
    return next(
      new AppError(
        "Please enter valid mongoDB ID for collaboratorId or permissionId",
        400
      )
    );

  const permission = await Permission.findOne({
    name: newPermission.permission,
  });
  if (newPermission.name === "owner")
    return next(new AppError("Cannot change owner permission", 400));

  if (!permission)
    return next(new AppError("Permission needed not exist", 404));

  const testCollaborator = await Collaborator.findById({ _id: collaboratorId });
  if (!testCollaborator)
    return next(new AppError("Collaborator not exist", 404));

  // Check creator permission to add collaborator
  const editorCollaborator = await Collaborator.findOne({
    projectId: testCollaborator.projectId,
    userId: req.user._id,
  });

  // Check is permission a owner
  if (newPermission.permission === "owner")
    return next(new AppError("Collaborators cannot be owner", 400));

  // Cannot change owner to other permission
  const project = await Project.findById(testCollaborator.projectId);
  if (compareId(project.owner, testCollaborator.userId))
    return next(new AppError("Cannot change owner's permission", 400));

  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You do not have edit to edit collaborator.",
    "can_edit",
    "owner"
  );

  const editedCollaboator = await Collaborator.findOneAndUpdate(
    { _id: collaboratorId },
    {
      permissionId: permission._id,
      editedAt: Date.now(),
      editedBy: req.user._id,
    }
  );

  res.status(204).json();
});

// DELETE /api/collaborator/:collaboratorId (finished)
exports.deleteCollaborator = catchAsync(async (req, res, next) => {
  const collaboratorId = req.params.collaboratorId;
  if (!isValidObjectId(collaboratorId))
    return next(
      new AppError(
        "Please enter valid mongoDB ID for collaboratorId or permissionId",
        401
      )
    );

  const testCollaborator = await Collaborator.findById({ _id: collaboratorId });
  if (!testCollaborator)
    return next(new AppError("Collaborator not exist", 404));

  // Check creator permission to add collaborator
  const deleteCollaborator = await Collaborator.findOne({
    projectId: testCollaborator.projectId,
    userId: req.user._id,
  });
  // Get permission owner and can_edit
  await checkCollab(
    next,
    testCollaborator.projectId,
    req.user._id,
    "You do not have edit to delete collaborator.",
    "can_edit",
    "owner"
  );
  const owner = await Permission.findOne({ name: "owner" });
  // Check is permission a owner
  if (compareId(testCollaborator.permissionId, owner._id))
    return next(new AppError("Cannot delete owner permission", 400));

  await Collaborator.deleteOne({ _id: collaboratorId });
  res.status(204).json();
});

// GET /api/project/:projectId/collaborator (finished)
exports.getCollaborator = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;

  if (!isValidObjectId(projectId))
    return next(
      new AppError("Please enter valid mongoDB ID for projectID", 400)
    );

  const project = await Project.findById(projectId);
  if (!project) return next(new AppError("Project not exist", 404));

  const collaborators = await Collaborator.find({ projectId });

  const formattedCollaborators = [];
  for (const collaborator of collaborators) {
    const user = await User.findById(collaborator.userId);
    const permission = await Permission.findById(collaborator.permissionId);
    formattedCollaborators.push({
      id: collaborator._id,
      name: user.name,
      email: user.email,
      permission: permission.name,
      permissionId: permission._id,
    });
  }

  res.status(200).json({
    status: "success",
    data: formattedCollaborators,
  });
});

// PATCH /api/collaborator/:collaboratorId/transferOwner (testing)
exports.transferOwner = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.collaboratorId))
    return next(new AppError("Invalid collaboratorId", 400));

  const testCollaborator = await Collaborator.findById(
    req.params.collaboratorId
  );
  if (!testCollaborator)
    return next(new AppError("Collaborator not exist", 404));

  await checkCollab(
    next,
    testCollaborator.projectId,
    req.user.id,
    "You do not have edit to transfer owner.",
    "owner"
  );

  // Change collaborator permission to owner
  const ownerPermssion = await Permission.findOne({ name: "owner" });
  const newOwner = await Collaborator.findByIdAndUpdate(
    req.params.collaboratorId,
    {
      permissionId: ownerPermssion._id,
    }
  );

  // Change project owner to can_edit
  const canEditPermission = await Permission.findOne({ name: "can_edit" });
  await Project.findByIdAndUpdate(testCollaborator.projectId, {
    owner: testCollaborator.userId,
  });

  await Collaborator.findOneAndUpdate(
    { userId: req.user.id, projectId: testCollaborator.projectId },
    {
      permissionId: canEditPermission._id,
    }
  );

  const oldOnwer = await Collaborator.findOne({ userId: req.user.id });

  res.status(204).json();
});
