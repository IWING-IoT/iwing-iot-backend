const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

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
  if (!testPhase) return next(new AppError("Phase not exist", 404));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 404));

  const testApis = await PhaseApi.find({ phaseId });
  for (const api of testApis) {
    if (api.name === req.body.name)
      return next(new AppError("Api name already exist", 400));
  }
  await checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to create a new api.",
    "can_edited",
    "owner"
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
        400
      )
    );

  const testPhase = await Phase.findById(phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 404));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 404));

  await checkCollab(
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
        400
      )
    );

  const testPhaseApi = await PhaseApi.findById(phaseApiId);
  if (!testPhaseApi) return next(new AppError("PhaseApi not exist", 404));

  const testPhase = await Phase.findById(testPhaseApi.phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 404));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 404));

  await checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to edit a new api.",
    "can_edited",
    "owner"
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
      return next(new AppError("Duplicate api name", 400));
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
        400
      )
    );

  const testPhaseApi = await PhaseApi.findById(phaseApiId);
  if (!testPhaseApi) return next(new AppError("PhaseApi not exist", 404));

  const testPhase = await Phase.findById(testPhaseApi.phaseId);
  if (!testPhase) return next(new AppError("Phase not exist", 404));

  const testProject = await Project.findById(testPhase.projectId);
  if (!testProject) return next(new AppError("Project not exist", 404));

  await checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to delete a api.",
    "can_edited",
    "owner"
  );

  await PhaseApi.deleteOne({ _id: phaseApiId });
  res.status(204).json();
});
