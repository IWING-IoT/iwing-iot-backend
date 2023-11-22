const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

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

exports.createCollaborator = catchAsync(async (req, res, next) => {
  const collaborator = req.body;
  const projectId = req.params.projectId;

  // Check if request has all required input
  if (!collaborator.email || !collaborator.permission)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  if (!isValidObjectId(projectId))
    return next(
      new AppError("Please enter valid mongoDB ID for projectID", 401)
    );

  const permission = await Permission.findOne({ _id: collaborator.permission });
  if (!permission)
    return next(new AppError("Permission needed not exist", 401));

  const collaboratorAccount = await User.findOne({
    email: collaborator.email,
  });
  if (!collaboratorAccount) return next(new AppError("User not found", 401));

  const testCollaborator = await Collaborator.findOne({
    userId: collaboratorAccount._id,
    projectId,
  });
  if (testCollaborator)
    return next(new AppError("Collaborator already exist", 401));

  // Check creator permission to add collaborator
  const creatorCollaborator = await Collaborator.findOne({
    projectId: projectId,
    userId: req.user._id,
  });
  if (!creatorCollaborator) return next(new AppError("Projecr not exist", 401));
  // Get permission owner and can_edit
  const can_edit = await Permission.findOne({ name: "can_edited" });
  const owner = await Permission.findOne({ name: "owner" });
  if (
    !compareId(creatorCollaborator.permissionId, can_edit._id) &&
    !compareId(creatorCollaborator.permissionId, owner._id)
  )
    return next(
      new AppError("You do not have permission to add new collaborator", 401)
    );

  const newCollaborator = await Collaborator.create({
    userId: collaboratorAccount._id,
    permissionId: collaborator.permission,
    projectId,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });
  res.status(201).json();
});

exports.editCollaborator = catchAsync(async (req, res, next) => {
  const newPermission = req.body;
  const collaboratorId = req.params.collaboratorId;

  if (!newPermission.permission)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  if (
    !isValidObjectId(collaboratorId) ||
    !isValidObjectId(newPermission.permission)
  )
    return next(
      new AppError(
        "Please enter valid mongoDB ID for collaboratorId or permissionId",
        401
      )
    );

  const permission = await Permission.findOne({
    _id: newPermission.permission,
  });
  if (!permission)
    return next(new AppError("Permission needed not exist", 401));

  const testCollaborator = await Collaborator.findById({ _id: collaboratorId });
  if (!testCollaborator)
    return next(new AppError("Collaborator not exist", 401));

  // Check creator permission to add collaborator
  const editorCollaborator = await Collaborator.findOne({
    projectId: testCollaborator.projectId,
    userId: req.user._id,
  });
  // Get permission owner and can_edit
  const can_edit = await Permission.findOne({ name: "can_edited" });
  const owner = await Permission.findOne({ name: "owner" });
  if (
    !compareId(editorCollaborator.permissionId, can_edit._id) &&
    !compareId(editorCollaborator.permissionId, owner._id)
  )
    return next(
      new AppError("You do not have permission to edit collaborator", 401)
    );

  // Check is permission a owner
  if (newPermission.equals(owner._id))
    return next(new AppError("Collaborators cannot be owner", 401));

  // Cannot change owner to other permission
  const project = await Project.findById(testCollaborator.projectId);
  if (compareId(project.owner, testCollaborator.userId))
    return next(new AppError("Cannot change owner's permission", 401));

  const editedCollaboator = await Collaborator.findOneAndUpdate(
    { _id: collaboratorId },
    {
      permissionId: newPermission.permission,
      editedAt: Date.now(),
      editedBy: req.user._id,
    }
  );

  res.status(204).json();
});

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
    return next(new AppError("Collaborator not exist", 401));

  // Check creator permission to add collaborator
  const deleteCollaborator = await Collaborator.findOne({
    projectId: testCollaborator.projectId,
    userId: req.user._id,
  });
  // Get permission owner and can_edit
  const can_edit = await Permission.findOne({ name: "can_edited" });
  const owner = await Permission.findOne({ name: "owner" });
  if (
    !compareId(deleteCollaborator.permissionId, can_edit._id) &&
    !compareId(deleteCollaborator.permissionId, owner._id)
  )
    return next(
      new AppError("You do not have permission to delete collaborator", 401)
    );
  // Check is permission a owner
  if (compareId(testCollaborator.permissionId, owner._id))
    return next(new AppError("Cannot delete owner permission", 401));

  await Collaborator.deleteOne({ _id: collaboratorId });
  res.status(204).json();
});

exports.getCollaborator = catchAsync(async (req, res, next) => {
  const projectId = req.params.projectId;

  if (!isValidObjectId(projectId))
    return next(
      new AppError("Please enter valid mongoDB ID for projectID", 401)
    );

  const project = await Project.findById(projectId);
  if (!project) return next(new AppError("Project not exist", 401));

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