const catchAsync = require("../utils/catchAsync");

const arrayTransfor = (req, res, next) => {
  if (req.fields instanceof Object && Object.keys(req.fields)[0] === "0") {
    req.fields = Object.keys(req.fields).map((key) => req.fields[key]);
  }
  next();
};

module.exports = arrayTransfor;
