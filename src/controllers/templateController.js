const mongoose = require("mongoose");

const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");

const Template = require("./../models/templateModel");
const { findOneAndUpdate } = require("../models/userModel");

exports.createTemplate = catchAsync(async (req, res, next) => {
  const newTemplate = await Template.create({
    createdBy: req.user._id,
    createdAt: Date.now(),
    editedBy: req.user._id,
    editedAt: Date.now(),
    ...req.body,
  });
  res.status(201).json();
});

exports.editTemplate = catchAsync(async (req, res, next) => {
  const templateId = req.params.templateId;
  console.log(templateId);
  const newTemplate = await Template.findOneAndUpdate(
    { _id: templateId },
    req.body
  );
  res.status(201).json();
});
