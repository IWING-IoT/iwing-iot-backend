const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Permission = require("./../models/permissionModel");

exports.createPermission = catchAsync(async (req, res, next) => {
  const permission = req.fields;
  // Check if request has all required input
  if (!permission.name || !permission.description)
    return next(
      new AppError(
        "Please input all required input for creating new project.",
        401
      )
    );

  const newPermission = await Permission.create(permission);
  res.status(201).json();
});
