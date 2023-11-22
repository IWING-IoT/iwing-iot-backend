const mongoose = require("mongoose");

const AppError = require("./../utils/appError");

const User = require("./../models/userModel");
const catchAsync = require("../utils/catchAsync");
const Role = require("../models/roleModel");

exports.addUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  
  // Check email validation
  const test = await User.findOne({ email });
  if (test) return next(new AppError("This email has already been used", 400));

  // Check role
  const testRole = await Role.findOne({ name: role });
  if (!testRole) return next(new AppError(`Role ${role} does not exist`));
  
  // Create new user
  const newUser = await User.create({
    name: name,
    email: email,
    password: password,
    roleId: testRole._id,
  });

  res.status(201).json({
    status: 201,
  });
});
