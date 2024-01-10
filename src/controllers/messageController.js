const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");
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

// GET /api/devicePhase/:devicePhaseId/message (testing)
exports.getMessageDevice = catchAsync(async (req, res, next) => {
  const limit = req.query.limit * 1 || 10;
  const page = req.query.page * 1 || 1;
  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("Invalid devicePhaseId", 400));

  const match = {
    "metadata.devicePhaseId": new mongoose.Types.ObjectId(
      req.params.devicePhaseId
    ),
  };

  if (req.query.dateStart) {
    match.timestamp = {
      $gte: new Date(req.query.dateStart),
    };
  }

  if (req.query.dateStop) {
    match.timestamp = {
      $lte: new Date(req.query.dateStop),
    };
  }
  const messages = await Message.aggregate([
    {
      $match: match,
    },
    {
      $sort: {
        timestamp: -1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: paginate(
      messages.map((obj) => {
        obj.id = obj._id;
        delete obj._id;
        return obj;
      }),
      limit,
      page
    ),
  });
});

// GET /api/message/:messageId (testing)
exports.getMessageDetail = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.messageId)) {
    return next(new AppError("Invalid messageId", 400));
  }

  const testMessage = await Message.findById(req.params.messageId);
  if (!testMessage) return next(new AppError("Invalid messageId", 400));

  res.status(200).json({
    status: "success",
    data: testMessage.map((obj) => {
      obj.id = obj._id;
      delete obj._id;
      return obj;
    }),
  });
});
