const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");


// POST /api/message/standalone
exports.createStandalone = catchAsync(async (req, res, next) => {
  res.status(201).json();
});

// POST /api/message/gateway
exports.createGateway = catchAsync(async (req, res, next) => {
  res.status(201).json();
});
