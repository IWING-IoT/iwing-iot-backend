const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Template = require("./../models/templateModel");
const { findOneAndUpdate } = require("../models/userModel");

const compareId = (id1, id2) => {
  return id1.toString() === id2.toString();
};

exports.createTemplate = catchAsync(async (req, res, next) => {
  const newTemplate = await Template.create({
    createdBy: req.user._id,
    createdAt: Date.now(),
    editedBy: req.user._id,
    editedAt: Date.now(),
    ...req.fields,
  });
  res.status(201).json();
});

exports.editTemplate = catchAsync(async (req, res, next) => {
  const templateId = req.params.templateId;
  console.log(templateId);
  const newTemplate = await Template.findOneAndUpdate(
    { _id: templateId },
    req.fields
  );
  res.status(201).json();
});

exports.getTemplate = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const templates = await Template.aggregate([
    {
      $match: {
        $or: [
          { createdBy: new mongoose.Types.ObjectId(userId) },
          { isPublic: true },
        ],
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
        description: "$description",
        // attributes: "$attributes",
      },
    },
  ]);

  console.log(templates);
  res.status(200).json({
    status: "success",
    data: templates,
  });
});
