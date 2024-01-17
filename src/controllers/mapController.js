const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const checkCollab = require("./../utils/checkCollab");

const Phase = require("./../models/phaseModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
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

// GET /api/phase/:phaseId/map/position
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

// GET /api/phase/:phaseId/map/path
exports.getMapPath = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  res.status(200).json();
});
