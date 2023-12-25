const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const checkCollab = require("./../utils/checkCollab");

const Phase = require("./../models/phaseModel");
const Device = require("./../models/deviceModel");
const DevicePhase = require("../models/devicePhaseModel");
const DeviceType = require("../models/deviceTypeModel");
const CategoryEntity = require("../models/categoryEntityModel");

const { sign } = require("crypto");

const signToken = (objectSigned) => {
  return jwt.sign(objectSigned, process.env.JWT_SECRET, {
    expiresIn: process.env.EXPIRES_IN,
  });
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

// POST /api/phase/:phaseId/device (testing)
exports.addDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  for (const device of req.body) {
    const testDevice = await Device.findById(device.deviceId);
    if (!testDevice) continue;
    let devicePhaseCreate = await DevicePhase.create({
      deviceId: testDevice._id,
      phaseId: req.params.phaseId,
      alias: req.body.alias && req.body.alias === "" ? req.body.alias : "",
      status: "inactive",
      createdAt: Date.now(),
      createdBy: req.user.id,
    });

    const deviceType = await DeviceType.findById(testDevice.type);
    if (deviceType.name !== "node")
      devicePhaseCreate = await DevicePhase.findByIdAndUpdate(
        devicePhaseCreate._id,
        {
          jwt: signToken({
            devicePhaseId: devicePhaseCreate._id,
          }),
        }
      );
  }

  res.status(201).json();
});

// GET /api/phase/:phaseId/device
exports.getDevice = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// PATCH /api/devicePhase/:devicePhaseId/status (testing)
exports.deviceStatus = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.parmas.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  if (testDevicePhase.status === "archived")
    return next(new AppError("Cannot change archived device status", 400));

  await DevicePhase.findByIdAndUpdate(req.params.devicePhaseId, {
    status: req.body.isActive ? "active" : "inactive",
    editedAt: Date.now(),
    editedBy: req.user.id,
  });
  res.status(204).json();
});

// DELETE /api/devicePhase/:devicePhaseId (testing)
exports.removeDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const updatedDevice = await Device.findById(testDevicePhase.deviceId);
  if (!updatedDevice) return next(new AppError("Device not found", 404));

  await Device.findByIdAndUpdate(updatedDevice._id, { status: "available" });
  await DevicePhase.findByIdAndDelete(req.params.devicePhaseId);

  res.status(204).json();
});

// PATCH /api/devicePhase/:devicePhaseId/jwt (testing)
exports.generateJwt = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const updateDevicePhase = await DevicePhase.findByIdAndUpdate(
    req.params.devicePhaseId,
    {
      jwt: signToken({
        devicePhaseId: req.params.devicePhaseId,
      }),
    }
  );

  res.status(204).json();
});

// GET /api/devicePhase/:devicePhaseId
exports.getDeviceInfo = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// GET /api/devicePhase/:devicePhaseId/stat
exports.getDeviceStat = catchAsync(async (req, res, next) => [
  res.status(200).json(),
]);

// GET /api/devicePhase/:devicePhaseId/firmware
exports.getDeviceFirmware = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// PATCH /api/devicePhase/:devicePhaseId (testing)
exports.editDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  if (req.body.alias) {
    await DevicePhase.findByIdAndUpdate(req.params.devicePhaseId, {
      alias: req.body.alias,
    });
  }

  if (req.body.associate) {
    const validEntry = [];
    // Check if type of entry id is correct
    for (const associate of req.body.associate) {
      const testEntry = await CategoryEntity.findById(associate);
      if (!testEntry) continue;
      validEntry.push(associate);
    }

    await DevicePhase.findByIdAndUpdate(req.params.devicePhaseId, {
      categoryDataId: validEntry,
    });
  }
  res.status(200).json();
});
