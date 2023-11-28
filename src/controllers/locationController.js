const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Location = require("./../models/locationModel");

exports.createLocation = catchAsync(async (req, res, next) => {
  const newLocation = await Location.create(req.body);

  res.status(201).json();
});

exports.getLocation = catchAsync(async (req, res, next) => {
  const location = await Location.aggregate([
    {
      $project: {
        id: "$_id",
        _id: 0,
        th_name: "$th_name",
        en_name: "$en_name",
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: location,
  });
});
