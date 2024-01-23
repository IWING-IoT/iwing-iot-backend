const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Device = require("../models/deviceModel");
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

// GET /api/devicePhase/:devicePhaseId/graph?type&range&points
// Get data from message and send into graph x, y axis
exports.getDeviceGraphSummary = catchAsync(async (req, res, next) => {
  // Check if devicePhaseId is valid
  const dataPoints = req.query.points * 1 || 5;
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const devicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!devicePhase) return next(new AppError("Invalid devicePhaseId", 400));

  // Check is message is cover range of time

  const messages = await Message.aggregate([
    {
      $match: {
        "metadata.devicePhaseId": new mongoose.Types.ObjectId(
          req.params.devicePhaseId
        ),
      },
    },
    {
      $group: {
        _id: null,
        min: { $min: "$timestamp" },
        max: { $max: "$timestamp" },
      },
    },
  ]);
  console.log(messages);
  console.log(messages[0].max - messages[0].min);
  if (
    req.query.range === "month" &&
    new Date(messages[0].max) - new Date(messages[0].min) >
      30 * 24 * 60 * 60 * 1000
  ) {
    console.log(true);
  }

  res.status(200).json();
});

// GET /api/phase/:phaseId/visualization
exports.getDashboard = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// POST /api/phase/:phaseId/visualization
exports.createDashboard = catchAsync(async (req, res, next) => {
  res.status(201).json();
});

// PATCH /api/vizualization/:visualizationId
exports.editDashboard = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// PUT /api/phase/:phaseId/visualization
exports.editLayout = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// DELETE /api/vizualization/:visualizationId
exports.deleteDashboard = catchAsync(async (req, res, next) => {
  res.status(204).json();
});
