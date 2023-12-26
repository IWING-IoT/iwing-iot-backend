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

// POST /api/phase/:phaseId/phaseApi (testing)
exports.createApi = catchAsync(async (req, res, next) => {
  const phaseId = req.params.phaseId;
  if (!req.fields.dataType || !req.fields.name || !isValidObjectId(phaseId))
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
    if (api.name === req.fields.name)
      return next(new AppError("Api name already exist", 400));
  }
  await checkCollab(
    next,
    testProject._id,
    req.user._id,
    "You do not have permission to create a new api.",
    "can_edit",
    "owner"
  );

  const newApi = await PhaseApi.create({
    phaseId,
    ...req.fields,
  });

  res.status(201).json();
});

// GET /api/phase/:phaseId/phaseApi (testing)
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
    "can_edit",
    "can_view",
    "owner"
  );

  const api = await PhaseApi.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
      },
    },
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

// PATCH /api/phaseApi/:phaseApiId (testing)
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
    "can_edit",
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
    if (req.fields.name && api.name === req.fields.name) {
      return next(new AppError("Duplicate api name", 400));
    }
  }

  const editPhaseApi = await PhaseApi.findByIdAndUpdate(phaseApiId, req.fields);

  res.status(204).json();
});

// DELETE /api/phaseApi/:phaseApi (testing)
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
    "can_edit",
    "owner"
  );

  await PhaseApi.deleteOne({ _id: phaseApiId });
  res.status(204).json();
});

// GET /api/phase/:phaseId/phaseApi/example (testing)
exports.example = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  const formatOutput = {
    gateway: { aliasName: "alias name of device" },
    default: {},
  };

  const apis = await PhaseApi.find({ phaseId: req.params.phaseId }).sort({
    createdAt: 1,
  });

  for (const api of apis) {
    formatOutput["gateway"][
      `${api.name}`
    ] = `enter ${api.name} with type ${api.dataType}`;

    formatOutput["default"][
      `${api.name}`
    ] = `enter ${api.name} with type ${api.dataType}`;
  }
  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// POST /api/phase/:phaseId/phaseApi/copy (testing)
exports.copy = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  const phases = await Phase.find({ projectId: testPhase.projectId }).sort({
    createdAt: -1,
  });

  if (phases.length === 1)
    return next(new AppError("There is no previous phase for copy", 400));

  // ต้องลบตัวเก่าออกก่อน

  await PhaseApi.deleteMany({ phaseId: req.params.phaseId });
  const previousApis = await PhaseApi.find({ phaseId: phases[1]._id }).sort({
    createdAt: 1,
  });
  for (const previousApi of previousApis) {
    const createdPhaseApi = await PhaseApi.create({
      phaseId: req.params.phaseId,
      description: previousApi.description ? previousApi.description : "",
      name: previousApi.name,
      dataType: previousApi.dataType,
      createdAt: Date.now(),
    });
  }

  res.status(201).json();
});
