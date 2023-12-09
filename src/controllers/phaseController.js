const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const checkCollab = require("./../utils/checkCollab");

const Collaborator = require("./../models/collaboratorModel");
const Phase = require("./../models/phaseModel");
const Permission = require("./../models/permissionModel");
const Project = require("./../models/projectModel");
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

exports.createPhase = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  if (!req.body.name) return next(new AppError("Phase required name.", 400));

  // Check permission wheather use has permission to create new phase
  const projectCollab = await Collaborator.findOne({
    projectId: req.params.projectId,
    userId: req.user._id,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project.", 403)
    );

  await checkCollab(
    next,
    req.params.projectId,
    req.user._id,
    "You do not have permission to create a new phase.",
    "owner",
    "can_edit"
  );

  const newPhase = await Phase.create({
    name: req.body.name,
    startedAt: req.body.startedAt || Date.now(),
    description: req.body.description || "",
    projectId: req.params.projectId,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });

  // Change other phase to inactive
  const otherPhasaes = await Phase.find({ projectId: req.params.projectId });
  for (const phase of otherPhasaes) {
    if (compareId(phase._id, newPhase._id)) break;
    await Phase.findByIdAndUpdate(
      { _id: phase._id },
      {
        isActive: false,
        endedAt: Date.now(),
      }
    );
  }
  res.status(201).json();
});

// exports.phaseStatus = catchAsync(async (req, res, next) => {
//   if (!isValidObjectId(req.params.phaseId))
//     return next(new AppError("Invalid phaseId", 400));

//   const phase = await Phase.findById(req.params.phaseId);
//   if (!phase) return next(new AppError("Phase not found", 403));

//   const project = await Project.findById(phase.projectId);
//   if (!project) return next(new AppError("Project not found", 404));

//   // Check permission wheather use has permission to change phase status
//   const projectCollab = await Collaborator.findOne({
//     projectId: project._id,
//     userId: req.user._id,
//   });

//   if (!projectCollab)
//     return next(
//       new AppError("You do not have permission to access this project.", 403)
//     );

//   await checkCollab(
//     next,
//     project._id,
//     req.user._id,
//     "You do not have permission to change phase status.",
//     "owner",
//     "can_edit"
//   );

// const updatedPhase = await Phase.findOneAndUpdate(
//   { _id: req.params.phaseId },
//   {
//     isActive: req.body.isActive,
//     editedAt: Date.now(),
//     editedBy: req.user._id,
//     endedAt: req.body.isActive ? null : Date.now(),
//   }
// );

// // Change other phase to inactive if change phase to active
// if (req.body.isActive) {
//   const otherPhasaes = await Phase.find({
//     projectId: project._id,
//     isDeleted: false,
//   });
//   for (const phase of otherPhasaes) {
//     if (compareId(phase._id, updatedPhase._id)) continue;
//     await Phase.findByIdAndUpdate(
//       { _id: phase._id },
//       {
//         isActive: false,
//         endedAt: Date.now(),
//       }
//     );
//   }
// } else {
//   const otherPhasaes = await Phase.find({
//     projectId: project._id,
//     isDeleted: false,
//   });

//   otherPhasaes.sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
//   if (otherPhasaes.length >= 1) {
//     await Phase.findOneAndUpdate(
//       { _id: otherPhasaes[0]._id },
//       { isActive: true, endedAt: null }
//     );
//   }
//   for (const phase of otherPhasaes) {
//     if (compareId(phase._id, otherPhasaes[0]._id)) continue;
//     await Phase.findByIdAndUpdate(phase._id, {
//       isActive: false,
//       endedAt: Date.now(),
//     });
//   }
// }
// res.status(204).json();
// });

exports.phaseStatus = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 403));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  // Check permission wheather use has permission to delete phase
  const projectCollab = await Collaborator.findOne({
    projectId: project._id,
    userId: req.user._id,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project.", 403)
    );

  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You do not have permission to change phase stauts.",
    "owner",
    "can_edit"
  );

  if (!req.body.isActive)
    return next(new AppError("You cannot change phase to active", 400));

  const updatedPhase = await Phase.findOneAndUpdate(
    { _id: req.params.phaseId },
    {
      isActive: req.body.isActive,
      editedAt: Date.now(),
      editedBy: req.user._id,
    }
  );

  res.status(204).json();
});

exports.deleted = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 404));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  // Check permission wheather use has permission to delete phase
  const projectCollab = await Collaborator.findOne({
    projectId: project._id,
    userId: req.user._id,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project.", 403)
    );

  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You do not have permission to delete phase.",
    "owner",
    "can_edit"
  );

  await Phase.findByIdAndUpdate(req.params.phaseId, {
    isDeleted: true,
    deletedAt: Date.now(),
    isActive: false,
  });
  res.status(204).json();
});

exports.getInfo = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findOne({ _id: req.params.phaseId });
  if (!phase) return next(new AppError("Phase not found", 404));
  if (phase.isDeleted) return next(new AppError("Phase has been deleted", 400));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  const owner = await User.findById(project.owner);

  // Get phase permission
  const collaborator = await Collaborator.findOne({
    projectId: project._id,
    userId: req.user._id,
  });

  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You cannot access this phase.",
    "owner",
    "can_edit",
    "can_view"
  );

  if (!collaborator) return next(new AppError("Collaborator not found", 404));

  const permission = await Permission.findById(collaborator.permissionId);

  if (!permission) return next(new AppError("Permission not found", 404));

  res.status(200).json({
    status: 200,
    data: {
      id: phase._id,
      name: phase.name,
      ownerName: owner.name,
      startedAt: phase.startedAt,
      endedAt: phase.endedAt,
      permission: permission.name,
    },
  });
});

exports.getPhases = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const match = {};
  if (req.query.type === "finished") {
    match["isActive"] = false;
  } else if (req.query.type === "all") {
  } else {
    match["isActive"] = true;
  }
  const phases = await Phase.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(req.params.projectId),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $match: match,
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
        owner: "$owner.name",
        isActive: "$isActive",
        startedAt: "$startedAt",
        endedAt: "$endedAt",
      },
    },
    {
      $sort: { startedAt: 1 },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: phases,
  });
});
