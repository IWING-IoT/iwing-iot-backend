const { model } = require("mongoose");

const errorDev = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else if (err.message === "jwt malformed") {
    res.status(400).json({
      status: "error",
      message: "JWT malform please use valid json",
    });
  } else if (err.message.indexOf("Cast to ObjectId failed") !== -1) {
    res.status(400).json({
      status: "error",
      message: "Invalid ObjectID please use mongoDB objectID format",
    });
  } else {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  errorDev(err, res);
};
