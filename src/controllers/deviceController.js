const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const checkCollab = require("./../utils/checkCollab");

const Device = require("../models/deviceModel");
const AppError = require("../utils/appError");
const DeviceType = require("../models/deviceTypeModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const Project = require("../models/projectModel");
const Phase = require("../models/phaseModel");
const Gateway = require("../models/gatewayModel");
const Mark = require("../models/markModel");
const Collaborator = require("../models/collaboratorModel");

const jwt = require("jsonwebtoken");

/**
 * @desc check wheather input id is valid mongodb objectID
 * @param {String} id that want to check
 * @return {Boolean} return true if inpur is valid mongodb;otherwise false
 */
const isValidObjectId = (id) => {
  if (mongoose.isValidObjectId(id)) return true;
  return false;
};

const compareId = (id1, id2) => {
  if (id1 && id2) {
    return id1.toString() === id2.toString();
  } else return false;
};

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

// POST /api/device (finished)
exports.createDevice = catchAsync(async (req, res, next) => {
  if (!req.fields.name || !req.fields.type)
    return next(new AppError("Invalid input"));
  const testDevice = await Device.findOne({ name: req.fields.name });
  if (testDevice) return next(new AppError("Duplicate device name", 400));
  const type = await DeviceType.findOne({ name: req.fields.type });
  const createdDevice = await Device.create({
    ...req.fields,
    type: type._id,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  res.status(201).json();
});

// GET /api/device (finished)
exports.getDevices = catchAsync(async (req, res, next) => {
  // Query project that matching requirement
  if (!req.query.type || !req.query.status)
    return next(new AppError("Required query", 400));
  const match = {};
  if (req.query.type !== "all") {
    match["device.name"] = req.query.type;
  }

  if (req.query.status !== "all") {
    match["status"] = req.query.status;
  }

  const devices = await Device.aggregate([
    {
      $lookup: {
        from: "devicetypes",
        localField: "type",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $unwind: "$device",
    },
    {
      $match: match,
    },
    {
      $project: {
        name: 1,
        id: "$_id",
        _id: 0,
        type: "$device.name",
        status: 1,
      },
    },
  ]);

  for (const device of devices) {
    let formatString = "";
    if (device.status === "inuse") {
      formatString = "In use";
      const testDevicePhase = await DevicePhase.findOne({
        deviceId: device.id,
      });
      const testPhase = await Phase.findById(testDevicePhase.phaseId);
      if (!testPhase) continue;

      const testProject = await Project.findById(testPhase.projectId);
      if (!testProject) continue;

      const collaborators = await Collaborator.find({
        projectId: testProject._id,
        userId: req.user.id,
      });
      device[`phaseId`] = testPhase._id;
      device[`projectId`] = testProject._id;
      device[`canAccess`] = collaborators.length > 0 ? true : false;
      if (device[`canAccess`]) {
        formatString += ` by ${testProject.name}`;
      }
    } else {
      formatString = device.status;
    }
    formatString = formatString[0].toUpperCase() + formatString.slice(1);
    device.status = formatString;
  }
  res.status(200).json({
    status: "success",
    data: devices,
  });
});

// PATCH /api/device/:deviceId/disable (finished)
exports.disableDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.deviceId))
    return next(new AppError("Invalid deviceId", 400));

  const testDevice = await Device.findById(req.params.deviceId);
  if (!testDevice) return next(new AppError("Device not found", 404));

  if (testDevice.status === "inuse")
    return next(new AppError("Cannot change inuse device state", 400));

  await Device.findByIdAndUpdate(req.params.deviceId, {
    status: req.fields.disable ? "unavailable" : "available",
  });

  res.status(204).json();
});

// PATCH /api/device/:deviceId (finished)
exports.editDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.deviceId))
    return next(new AppError("Invalid deviceId", 400));

  const testDevice = await Device.findById(req.params.deviceId);
  if (!testDevice) return next(new AppError("Device not found", 404));

  if (!req.fields.name) return next(new AppError("Invalid input", 400));

  await Device.findByIdAndUpdate(req.params.deviceId, {
    name: req.fields.name,
  });
  res.status(204).json();
});

// DELETE /api/device/:deviceId (testing)
exports.deleteDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.deviceId))
    return next(new AppError("Invalid deviceId", 400));

  const testDevice = await Device.findById(req.params.deviceId);
  if (!testDevice) return next(new AppError("Device not found", 404));

  const devicePhases = await DevicePhase.find({
    deviceId: req.params.deviceId,
  }).populate("deviceId");
  for (const devicePhase of devicePhases) {
    // Delete devicephase message
    await Message.deleteMany({ "metadata.devicePhaseId": devicePhase._id });
    // Delete all devicePhase
    const type = await DeviceType.findById(devicePhase.deviceId.type);
    if (type.name === "gateway") {
      await Gateway.deleteMany({ gatewayId: devicePhase.deviceId._id });
    }
    await Mark.deleteMany({ devicePhaseId: devicePhase._id });
    await DevicePhase.deleteMany({ deviceId: req.params.deviceId });
  }
  await Device.findByIdAndDelete(req.params.deviceId);

  res.status(204).json();
});
