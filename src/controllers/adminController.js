const mongoose = require("mongoose");

const AppError = require("./../utils/appError");

const User = require("./../models/userModel");
const catchAsync = require("../utils/catchAsync");
const Role = require("../models/roleModel");

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

/**
 * @desc check wheather input id is valid mongodb objectID
 * @param {String} id that want to check
 * @return {Boolean} return true if inpur is valid mongodb;otherwise false
 */
const isValidObjectId = (id) => {
  if (mongoose.isValidObjectId(id)) return true;
  return false;
};

exports.addUser = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.fields;

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

exports.getUser = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const users = await User.aggregate([
    {
      $lookup: {
        from: "roles",
        localField: "roleId",
        foreignField: "_id",
        as: "role",
      },
    },
    {
      $unwind: "$role",
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        email: "$email",
        name: "$name",
        role: "$role.name",
        userStatus: "$userStatus",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: users,
  });
});

exports.edited = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.accountId))
    return next(new AppError("Invalid ID", 400));

  const testUser = await User.findById(req.params.accountId);

  const newRole = await Role.findOne({ name: req.fields.role });

  const editedUser = await User.findOneAndUpdate(
    { _id: req.params.accountId },
    {
      name: req.fields.name,
      email: req.fields.email,
      roleId: newRole ? newRole._id : testUser.roleId,
      editedAt: Date.now(),
    }
  );
  res.status(204).json();
});
