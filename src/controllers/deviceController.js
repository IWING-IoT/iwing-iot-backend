const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");

const Device = require("../models/deviceModel");
const AppError = require("../utils/appError");

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

// POST /api/device
exports.createDevice = catchAsync(async (req, res, next) => {
  if (!req.body.name || req.body.type)
    return next(new AppError("Invalid input"));
  const testDevice = await Device.findOne({ name: req.body.name });
  if (testDevice) return next(new AppError("Duplicate device name", 400));

  const createdDevice = await Device.create({
    ...req.body,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  res.status(201).json();
});

// GET /api/device
exports.getDevices = catchAsync(async (req, res, next) => ({}));
