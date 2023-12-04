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
    return next(
      new AppError("You do not have permission to access this project.", 403)
    );
  const permissionIds = await Permission.find({ name: { $in: permission } });

  let i = 1;
  for (const permissionI of permissionIds) {
    if (compareId(permissionIds[i]._id, projectCollab.permissionId)) break;
    if (i === permissionIds.length) return next(new AppError(message, 401));
    i++;
  }
};
