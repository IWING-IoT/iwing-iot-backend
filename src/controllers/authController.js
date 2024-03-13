const jwt = require("jsonwebtoken");
const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const { promisify } = require("util");

const User = require("./../models/userModel");
const Role = require("./../models/roleModel");
const {
  ListBucketInventoryConfigurationsOutputFilterSensitiveLog,
} = require("@aws-sdk/client-s3");
const signToken = (objectSigned) => {
  return jwt.sign(objectSigned, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });
};

// API /signin
exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.fields;

  // Check if email and password is exist from client
  if (!email || !password)
    return next(new AppError("Please provide email or password", 400));

  const user = await User.findOne({ email }).select("+password");
  // Check email and password wheather is correct or not
  if (!user || !user.correctPassword(password, user.password))
    return next(new AppError("Incorrect email or password", 401));

  const role = await Role.findById(user.roleId);

  const token = signToken({
    id: user._id,
    name: user.name,
    email: user.email,
    role: role.name,
  });
  res.status(200).json({
    status: "success",
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in, please log in to gain access.", 401)
    );
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if this user is exist
  const user = await User.findById(decoded.id);
  if (!user)
    return next(
      new AppError("The user belonging to the token no longer exists.", 400)
    );

  req.user = user;
  next();
});

// Input list of user accessable user
exports.restrictTo = (...roles) => {
  return async (req, res, next) => {
    const userRole = await Role.findById(req.user.roleId);

    if (!roles.includes(userRole.name)) {
      return next(
        new AppError("You do not have permission to perform this action ", 403),
        403
      );
    }
    next();
  };
};
