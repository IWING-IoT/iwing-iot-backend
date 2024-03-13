const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Role = require("./../models/roleModel");

exports.addRole = catchAsync(async (req, res, next) => {
  const role = req.fields;
  if (!role.name) return next(new AppError("Role required name"));
  const test = await Role.findOne({ name: role.name });
  if (test) return next(new AppError(`Role ${role.name} already exist`, 401));
  const newRole = await Role.create(role);
  res.status(201).json();
});
