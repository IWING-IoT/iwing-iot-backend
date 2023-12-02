const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Phase = require("./../models/phaseModel");
const Project = require("./../models/projectModel");
const PhaseApi = require("./../models/phaseApiModel");
const Collaborator = require("./../models/collaboratorModel");
const Permission = require("./../models/permissionModel");
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

const checkCollab = async (next, projectId, userId, message, ...permission) => {
  // Check permission wheather use has permission to create new phase
  const projectCollab = await Collaborator.findOne({
    projectId,
    userId,
  });

  if (!projectCollab)
    return next(
      new AppError("You do not have permission to access this project.", 401)
    );
  const permissionIds = await Permission.find({ name: { $in: permission } });

  for (let i = 1; i < permissionIds; ++i) {
    if (compareId(permissionIds[0]._id, projectCollab.permissionId)) break;
    if (i === permissionIds.length) return next(new AppError(message, 401));
  }
};

exports.createApi = catchAsync(async (req, res, next) => {
  const phaseId = req.params.phaseId;
  if (!req.body.dataType || !req.body.name || !isValidObjectId(phaseId))
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );
  const testPhase = await Phase.findById(phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 401));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 401));

  const testApis = await PhaseApi.find({ phaseId });
  for (const api of testApis) {
    if (api.name === req.body.name)
      return next(new AppError("Api name already exist", 401));
  }
  checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to create a new api.",
    "can_edited"
  );

  const newApi = await PhaseApi.create({
    phaseId,
    ...req.body,
  });

  res.status(201).json();
});

exports.getApi = catchAsync(async (req, res, next) => {
  const phaseId = req.params.phaseId;

  if (!phaseId)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  const testPhase = await Phase.findById(phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 401));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 401));

  checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to view a new api.",
    "can_edited",
    "can_viewed"
  );

  const api = await PhaseApi.aggregate([
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
        dataType: "$dataType",
        description: "$description",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: api,
  });
});

exports.edited = catchAsync(async (req, res, next) => {
  const phaseApiId = req.params.phaseApiId;

  if (!phaseApiId)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  const testPhaseApi = await PhaseApi.findById(phaseApiId);
  if (!testPhaseApi) return next(new AppError("PhaseApi not exist", 401));

  const testPhase = await Phase.findById(testPhaseApi.phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 401));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 401));

  checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to edit a new api.",
    "can_edited"
  );

  const phaseApiName = [];

  const apis = await PhaseApi.aggregate([
    {
      $match: {
        _id: {
          $not: { $eq: new mongoose.Types.ObjectId(phaseApiId) },
        },
        phaseId: new mongoose.Types.ObjectId(testPhase._id),
      },
    },
  ]);

  console.log(apis);
  for (const api of apis) {
    if (req.body.name && api.name === req.body.name) {
      return next(new AppError("Duplicate api name", 401));
    }
  }

  const editPhaseApi = await PhaseApi.findByIdAndUpdate(phaseApiId, req.body);

  res.status(204).json();
});

exports.deleted = catchAsync(async (req, res, next) => {
  const phaseApiId = req.params.phaseApiId;

  if (!phaseApiId)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  const testPhaseApi = await PhaseApi.findById(phaseApiId);
  if (!testPhaseApi) return next(new AppError("PhaseApi not exist", 401));

  await PhaseApi.deleteOne({ _id: phaseApiId });
  res.status(204).json();
});
