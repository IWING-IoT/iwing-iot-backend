const Test = require("./../models/testModel");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

exports.getArray = catchAsync(async (req, res, next) => {
  const array = Test.findOne({});
  res.status(200).json(array);
});

exports.postArray = catchAsync(async (req, res, next) => {
  const createArray = Test.create({
    arrayTest: ["Hello", "Hello2", "Hello3"],
    fuck: "Fuck you",
  });
  res.status(201).json();
});

exports.putArray = catchAsync(async (req, res, next) => {
  const putArray = Test.findOneAndUpdate();
  res.status(204).json();
});
