const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

const checkCollab = require("./../utils/checkCollab");

const Phase = require("./../models/phaseModel");
const Device = require("./../models/deviceModel");
const DevicePhase = require("../models/devicePhaseModel");
const DeviceType = require("../models/deviceTypeModel");
const CategoryEntity = require("../models/categoryEntityModel");
const Attribute = require("../models/attributeModel");
const AttributeValue = require("../models/attributeValueModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");
const Gateway = require("../models/gatewayModel");
const FirmwareVersion = require("../models/firmwareVersionModel");
const Firmware = require("../models/firmwareModel");
const DeviceFirmware = require("../models/deviceFirmwareModel");

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

// GET /api/devicePhase/:devicePhaseId/firmware (testing)
exports.getDeviceFirmware = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId)) {
    return next(new AppError("Invalid devicePhaseId", 400));
  }

  const devicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!devicePhase) {
    return next(new AppError("DevicePhase not found", 404));
  }

  const deviceFirmwares = await DeviceFirmware.find({
    devicePhaseId: req.params.devicePhaseId,
    isActive: true,
  });

  const formatOutput = {};

  for (const firmware of deviceFirmwares) {
    const firmwareVersion = await FirmwareVersion.findById(
      firmware.firmwareVersionId
    );
    if (!firmwareVersion)
      return next(new AppError("FirmwareVersion not found", 404));

    const firmware = await Firmware.findById(firmwareVersion.firmwareId);
    if (!firmware) return next(new AppError("Firmware not found", 404));

    const urlParts = firmwareVersion.gitUrl.split("/");
    formatOutput[firmware.type] = {
      id: firmwareVersion.id,
      name: firmware.name,
      commitNumber: urlParts[urlParts.length - 1].substring(0, 7),
      autoUpdate: firmware.autoUpdate,
    };
  }

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// POST /api/devicePhase/:devicePhaseId/firmware (testing)
exports.addFirmware = catchAsync(async (req, res, next) => {
  // {
  //     "type": "config or source or binary",
  //     "id": "id_of_firmwareVersion",
  //     "autoUpdate": "true or false"
  // }

  if (!isValidObjectId(req.params.devicePhaseId)) {
    return next(new AppError("Invalid devicePhaseId", 400));
  }

  const devicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!devicePhase) {
    return next(new AppError("DevicePhase not found", 404));
  }

  const testPhase = await Phase.findById(devicePhase.phaseId);
  if (!testPhase) {
    return next(new AppError("TestPhase not found", 404));
  }

  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to add firmware to device.",
    "can_edit",
    "owner"
  );

  if (!req.fields.type || !req.fields.id) {
    return next(new AppError("Invalid input", 400));
  }

  const firmwareVersion = await FirmwareVersion.findById(req.fields.id);
  if (!firmwareVersion) {
    return next(new AppError("FirmwareVersion not found", 404));
  }

  const testDeviceFirmware = await DeviceFirmware.findOne({
    devicePhaseId: devicePhase.deviceId,
    isActive: true,
  });

  if (testDeviceFirmware) {
    const testFirmwareVersion = await FirmwareVersion.findById(
      testDeviceFirmware.firmwareVersionId
    );
    const testFirmware = await Firmware.findById(
      testFirmwareVersion.firmwareId
    );
    if (testFirmware.type === req.fields.type) {
      return next(
        new AppError("Device already has this type of firmware", 400)
      );
    }
  }

  const newDeviceFirmware = await DeviceFirmware.create({
    devicePhaseId: req.params.devicePhaseId,
    firmwareVersionId: req.fields.id,
    autoUpdate: req.fields.autoUpdate,
    startedAt: Date.now(),
  });

  res.status(201).json();
});

// PATCH /api/deviceFirmware/:deviceFirmwareId (testing)
exports.editDeviceFirmware = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.deviceFirmwareId))
    return next(new AppError("Invalid deviceFirmwareId", 400));

  const deviceFirmware = await DeviceFirmware.findById(
    req.params.deviceFirmwareId
  );
  if (!deviceFirmware)
    return next(new AppError("DeviceFirmware not found", 404));

  const devicePhase = await DevicePhase.findById(deviceFirmware.devicePhaseId);
  if (!devicePhase) {
    return next(new AppError("DevicePhase not found", 404));
  }
  checkCollab(
    next,
    devicePhase.phaseId,
    req.user.id,
    "You do not have permission to edit device firmware.",
    "can_edit",
    "owner"
  );

  if (req.fields.id) {
    // Create new deviceFirmware
    const newDeviceFirmware = await DeviceFirmware.create({
      devicePhaseId: deviceFirmware.devicePhaseId,
      firmwareVersionId: req.fields.id,
      autoUpdate: deviceFirmware.autoUpdate,
      startedAt: Date.now(),
    });

    deviceFirmware.endedAt = Date.now();
    deviceFirmware.isActive = false;
    await deviceFirmware.save();
  } else {
    deviceFirmware.autoUpdate = req.fields.autoUpdate;
    await deviceFirmware.save();
  }

  res.status(204).json();
});

// DELETE /api/deviceFirmware/:deviceFirmwareId (testing)
exports.deleteDeviceFirmware = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.deviceFirmwareId))
    return next(new AppError("Invalid deviceFirmwareId", 400));

  const deviceFirmware = await DeviceFirmware.findById(
    req.params.deviceFirmwareId
  );

  if (!deviceFirmware)
    return next(new AppError("DeviceFirmware not found", 404));

  deviceFirmware.endedAt = Date.now();
  deviceFirmware.isActive = false;
  await deviceFirmware.save();

  res.status(204).json();
});

// GET /api/devicePhase/:devicePhaseId/firmwareLog (testing)
exports.getDeviceFirmwareLog = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId)) {
    return next(new AppError("Invalid devicePhaseId", 400));
  }
  const devicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!devicePhase) {
    return next(new AppError("DevicePhase not found", 404));
  }
  const deviceFirmwares = await DeviceFirmware.find({
    devicePhaseId: req.params.devicePhaseId,
  });

  const formatOutput = {
    config: [],
    source: [],
    binary: [],
  };

  for (const deviceFirmware of deviceFirmwares) {
    const firmwareVersion = await FirmwareVersion.findById(
      firmware.firmwareVersionId
    );
    if (!firmwareVersion) {
      return next(new AppError("FirmwareVersion not found", 404));
    }
    const firmware = await Firmware.findById(firmwareVersion.firmwareId);
    if (!firmware) {
      return next(new AppError("Firmware not found", 404));
    }

    formatOutput[deviceFirmware.type].push({
      id: firmwareVersion._id,
      startedAt: deviceFirmware.startedAt,
      endedAt: deviceFirmware.endedAt,
      firmwareName: firmware.name,
      firmwareVersion: firmwareVersion.name,
    });
  }

  formatOutput.config.sort((a, b) => a.startedAt - b.startedAt);
  formatOutput.source.sort((a, b) => a.startedAt - b.startedAt);
  formatOutput.binary.sort((a, b) => a.startedAt - b.startedAt);

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});
