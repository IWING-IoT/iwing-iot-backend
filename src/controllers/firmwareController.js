const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

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

// GET /api/firmware
exports.getFirmware = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// POST /api/firmware
exports.createFirmware = catchAsync(async (req, res, next) => {
  // Check input
  const { name, type, versionName, gitUrl, description } = req["fields"];
  if (!name || !type || !versionName)
    return next(new AppError("Invalid input", 40));

  res.status(201).json();
});

// POST /api/firmware/:firmwareId
exports.createVersion = catchAsync(async (req, res, next) => {
  res.status(201).json();
});

// DELETE /api/firmware/:firmwareId
exports.deleteFirmware = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// DELETE /api/firmwareVersion/:firmwareVersionId
exports.deleteVersion = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// PATCH /api/firmware/:firmwareId
exports.editFirmware = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// PATCH /api/firmwareVersion/:firmwareVersionId
exports.editVersion = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// GET /api/firmwareVersion/:firmwareVersionId
exports.getVersion = catchAsync(async (req, res, next) => {
  res.status(200).json();
});
