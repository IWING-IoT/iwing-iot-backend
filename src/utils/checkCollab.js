const Collaborator = require("./../models/collaboratorModel");
const Permission = require("./../models/permissionModel");

const catchAsync = require("./catchAsync");
const AppError = require("./appError");

const compareId = (id1, id2) => {
  return id1.toString() === id2.toString();
};

module.exports = async (next, projectId, userId, message, ...permission) => {
  // Check permission wheather use has permission to create new phase
  const projectCollab = await Collaborator.findOne({
    projectId,
    userId,
  });

  if (!projectCollab)
    next(
      new AppError("You do not have permission to access this project.", 403)
    );
  const permissionIds = await Permission.find({ name: { $in: permission } });

  let checkPermission = false;

  for (const permission of permissionIds) {
    if (compareId(projectCollab.permissionId, permission._id)) {
      checkPermission = true;
    }
  }

  if (!checkPermission) return next(new AppError(message, 403));
};
