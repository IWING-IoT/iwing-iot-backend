const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const checkCollab = require("./../utils/checkCollab");

const Phase = require("./../models/phaseModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const Area = require("../models/areaModel");

const turf = require("@turf/turf");
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
  if (id1 && id2) {
    return id1.toString() === id2.toString();
  } else return false;
};

/**
 * @desc paginate array by page_size and page_number
 * @param {Array} array any array
 * @param {Number} page_size object per page
 * @param {Number} page_number skip to which page
 * @returns return paginated array
 */
const paginate = (array, page_size, page_number) => {
  // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
  return array.slice((page_number - 1) * page_size, page_number * page_size);
};

// Validate coordinates using Turf.js
const validateCoordinates = (coordinates) => {
  // Ensure at least 3 coordinates are provided
  if (coordinates.length < 3) {
    return false;
  }

  // Ensure the first and last coordinates are the same
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    return false;
  }

  // Create a polygon from the coordinates
  const polygon = turf.polygon([coordinates]);

  // Check if the polygon is valid
  if (!turf.booleanValid(polygon)) {
    return false;
  }

  // Additional checks if needed

  return true;
};

// GET /api/phase/:phaseId/map/position (testing)
exports.getMapPosition = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const formatOutput = [];

  const devicePhases = await DevicePhase.find({
    phaseId: req.params.phaseId,
  }).populate("deviceId");
  for (const devicePhase of devicePhases) {
    const message = await Message.find({
      "metadata.devicePhaseId": devicePhase._id,
      createdAt: {
        $lte: req.query.time
          ? new Date(req.query.time.split(" ")[0])
          : new Date(),
      },
    })
      .sort({ timestamp: -1 })
      .limit(1);

    if (message && message.length === 1) {
      formatOutput.push({
        devicePhaseId: devicePhase._id,
        name: devicePhase.deviceId.name,
        alias: devicePhase.alias,
        latitude: message[0].latitude,
        longitude: message[0].longitude,
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// GET /api/phase/:phaseId/map/path (testing)
exports.getMapPath = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const devicePhases = await DevicePhase.find({
    phaseId: req.params.phaseId,
  }).populate("deviceId");

  const formatOutput = [];
  for (const devicePhase of devicePhases) {
    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": devicePhase._id,
          createdAt: {
            $lte: req.query.endAt
              ? new Date(req.query.endAt.split(" ")[0])
              : new Date(),
            $gte: req.query.startAt
              ? new Date(req.query.endAt.split(" ")[0])
              : new Date(0),
          },
        },
      },
      { $sort: { timestamp: 1 } },
      {
        $project: {
          id: "$_id",
          _id: 0,
          latitude: 1,
          longitude: 1,
          createdAt: 1,
        },
      },
    ]);

    formatOutput.push({
      devicePhaseId: devicePhase._id,
      name: devicePhase.deviceId.name,
      alias: devicePhase.alias,
      path: messages,
    });
  }

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// GET /api/phase/:phaseId/area (testing)
exports.getMapAreas = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const areas = await Area.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        coordinates: 1,
        isActive: 1,
        alert: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: areas,
  });
});

// GET /api/phase/:phaseId/area (testing)
exports.createArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }

  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to create new area.",
    "can_edit",
    "owner"
  );

  if (!req.fields.name || !req.fields.coordinates) {
    return next(new AppError("Invalid input", 400));
  }

  if (!validateCoordinates(req.fields.coordinates)) {
    return next(new AppError("Invalid coordinates", 400));
  }

  const newArea = await Area.create({
    name: req.fields.name,
    description: req.fields.description,
    phaseId: req.params.phaseId,
    coordinates: req.fields.coordinates,
    createdAt: new Date(),
    createdBy: req.user.id,
  });

  res.status(201).json();
});

// GET /api/area/:areaId (testing)
exports.getArea = catchAsync(async (req, res, next) => {
  เ;
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.params.areaId) },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        coordinates: 1,
        isActive: 1,
        alert: 1,
      },
    },
  ]);
  if (!area[0]) {
    return next(new AppError("Area not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: area[0],
  });
});

// PUT /api/area/:areaId (testing)
exports.editArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.findById(req.params.areaId);
  if (!area) {
    return next(new AppError("Area not found", 404));
  }
  const testPhase = Phase.findById(area.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }
  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to edit area.",
    "can_edit",
    "owner"
  );

  if (!req.fields.name || !req.fields.coordinates || !req.fields.description) {
    return next(new AppError("Invalid input", 400));
  }

  if (!validateCoordinates(req.fields.coordinates)) {
    return next(new AppError("Invalid coordinates", 400));
  }

  area.name = req.fields.name;
  area.description = req.fields.description;
  area.coordinates = req.fields.coordinates;
  area.isActive = req.fields.isActive;
  area.editedAt = new Date();
  area.editedBy = req.user.id;
  await area.save();

  res.status(204).json();
});

// DELETE /api/area/:areaId (testing)
exports.deleteArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.findById(req.params.areaId);
  if (!area) {
    return next(new AppError("Area not found", 404));
  }
  const testPhase = Phase.findById(area.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }
  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to delete area.",
    "can_edit",
    "owner"
  );

  await area.remove();
  res.status(204).json();
});
