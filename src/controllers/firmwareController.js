const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

const Upload = require("./../utils/upload");

const axios = require("axios");
const fs = require("fs");
const crypto = require("crypto");
const Firmware = require("../models/firmwareModel");
const FirmwareVersion = require("../models/firmwareVersionMode");
const User = require("../models/userModel");

const DeviceFirmware = require("../models/deviceFirmwareModel");
const {
  ListBucketInventoryConfigurationsOutputFilterSensitiveLog,
} = require("@aws-sdk/client-s3");

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

// GET /api/firmware (testing)
exports.getFirmware = catchAsync(async (req, res, next) => {
  if (!req.query.type) return next(new AppError("Invalid input", 400));
  const firmwares = await Firmware.aggregate([
    {
      $match: {
        type: req.query.type,
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        type: 1,
        createdAt: 1,
        editedAt: 1,
      },
    },
  ]);

  for (const firmware of firmwares) {
    const firmwareVersions = await FirmwareVersion.find({
      firmwareId: firmware.id,
    }).sort({ createdAt: -1 });

    if (firmwareVersions.length === 0) {
      firmware.lastUpdate = firmware.editedAt
        ? firmware.editedAt
        : firmware.createdAt;
    } else {
      firmware.lastUpdate = firmwareVersions[0].createdAt;
    }
  }

  res.status(200).json({
    status: "success",
    data: firmwares,
  });
});

// POST /api/firmware (testing)
exports.createFirmware = catchAsync(async (req, res, next) => {
  // Check input
  const { name, type, versionName, gitUrl, description, versionDescription } =
    req["fields"];
  if (!name || !type || !versionName || !req.files.file)
    return next(new AppError("Invalid input", 400));

  // Create firmware
  const createdFirmware = await Firmware.create({
    name,
    type,
    description,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });

  // Upload file
  const { filename, url } = await Upload.putObject();
  const filePath = req.files.file.path; // Get the path of the uploaded file
  fs.readFile(filePath, async (err, fileData) => {
    if (err) {
      return res.status(500).json({ error: "File reading failed." });
    }
    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": req.files.file.type,
      },
      body: fileData,
    });
  });

  const createdFirmwareVersion = await FirmwareVersion.create({
    firmwareId: createdFirmware._id,
    name: versionName,
    gitUrl,
    description: versionDescription,
    filename,
    fileExtension: req.files.file.name.split(".")[1],
    createdAt: Date.now(),
    createdBy: req.user.id,
  });
  res.status(201).json();
});

// GET /api/firmware/:firmwareId (testing)
exports.getVersions = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareId))
    return next(new AppError("Invalid firmwareId", 400));

  const testFirmware = await Firmware.findById(req.params.firmwareId);
  if (!testFirmware) return next(new AppError("Firmware not found", 404));

  const firmwareVersions = await FirmwareVersion.aggregate([
    {
      $match: {
        firmwareId: new mongoose.Types.ObjectId(req.params.firmwareId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        gitUrl: 1,
        lastUpdate: "$createdAt",
      },
    },
  ]);

  for (const version of firmwareVersions) {
    if (version.gitUrl && version.gitUrl.length > 0) {
      const urlParts = version.gitUrl.split("/");

      version.commitNumber = urlParts[urlParts.length - 1].substring(0, 7);
    }
  }
  res.status(200).json({
    status: "success",
    data: firmwareVersions,
  });
});

// POST /api/firmware/:firmwareId (testing)
exports.createVersion = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareId))
    return next(new AppError("Invalid firmwareId"));

  const testFirmware = await Firmware.findById(req.params.firmwareId);
  if (!testFirmware) return next(new AppError("Firmware not found", 404));

  const { versionName, gitUrl, versionDescription } = req.fields;
  if (!req.files.file || !versionName)
    return next(new AppError("Invalid input", 400));

  const firmwareVersions = await FirmwareVersion.find({
    firmwareId: req.params.firmwareId,
  });

  // Check duplicate versionName
  if (firmwareVersions.map((obj) => obj.name).includes(versionName))
    return next(new AppError("Duplicate version name", 400));

  const { filename, url } = await Upload.putObject();
  const filePath = req.files.file.path; // Get the path of the uploaded file
  fs.readFile(filePath, async (err, fileData) => {
    if (err) {
      return res.status(500).json({ error: "File reading failed." });
    }
    await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": req.files.file.type,
      },
      body: fileData,
    });
  });

  const createdFirmwareVersion = await FirmwareVersion.create({
    firmwareId: req.params.firmwareId,
    name: versionName,
    gitUrl,
    description: versionDescription,
    filename,
    fileExtension: req.files.file.name.split(".")[1],
    createdAt: Date.now(),
    createdBy: req.user.id,
  });

  res.status(201).json();
});

// DELETE /api/firmware/:firmwareId (testing)
exports.deleteFirmware = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareId))
    return next(new AppError("Invalid firmwareId", 400));

  const testFirmware = await Firmware.findById(req.params.firmwareId);
  if (!testFirmware) return next(new AppError("Firmware not found", 404));

  // Delete each versionFirmware
  const versionFirmwares = await FirmwareVersion.find({
    firmwareId: req.params.firmwareId,
  });

  for (const version of versionFirmwares) {
    await DeviceFirmware.deleteMany({
      firmwareVersionId: version._id,
    });

    // Delete
    await Upload.deleteObject(version.filename);

    await FirmwareVersion.deleteOne({ _id: version._id });
  }

  await Firmware.deleteOne({ _id: req.params.firmwareId });

  res.status(204).json();
});

// DELETE /api/firmwareVersion/:firmwareVersionId (testing)
exports.deleteVersion = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareVersionId))
    return next(new AppError("Invalid firmwareVersionId", 400));

  const testFirmwareVersion = await FirmwareVersion.findById(
    req.params.firmwareVersionId
  );

  if (!testFirmwareVersion)
    return next(new AppError("firmwareVersion not found", 404));

  await Upload.deleteObject(testFirmwareVersion.filename);

  await FirmwareVersion.deleteOne({ _id: req.params.firmwareVersionId });

  await DeviceFirmware.deleteMany({
    firmwareVersionId: req.params.firmwareVersionId,
  });

  await res.status(204).json();
});

// PATCH /api/firmware/:firmwareId (testing)
exports.editFirmware = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareId))
    return next(new AppError("Invalid firmwareId", 400));

  const testFirmware = await Firmware.findById(req.params.firmwareId);
  if (!testFirmware) return next(new AppError("Firmware not found", 404));

  await Firmware.findByIdAndUpdate(req.params.firmwareId, {
    name: req.fields.name,
    description: req.fields.description,
    editedAt: Date.now(),
    editedBy: req.user.id,
  });

  res.status(204).json();
});

// PATCH /api/firmwareVersion/:firmwareVersionId (testing)
exports.editVersion = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.parmas.firmwareVersionId))
    return next(new AppError("Invalid firmwareVersionId", 400));

  const { versionName, gitUrl, versionDescription } = req.fields;
  if (!req.files.file || !versionName)
    return next(new AppError("Invalid input", 400));

  const testFirmwareVersion = await FirmwareVersion.findById(
    req.parmas.firmwareVersionId
  );
  if (!testFirmwareVersion)
    return next(new AppError("Firmware Version not found", 404));

  if (req.files.file) {
    // New version file

    // Delete old file
    await Upload.deleteObject(testFirmwareVersion.filename);

    // Create new Object
    const { filename, url } = await Upload.putObject();
    const filePath = req.files.file.path; // Get the path of the uploaded file
    fs.readFile(filePath, async (err, fileData) => {
      if (err) {
        return res.status(500).json({ error: "File reading failed." });
      }
      await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": req.files.file.type,
        },
        body: fileData,
      });
    });
  }

  const updatedFirmwareVersion = await FirmwareVersion.findByIdAndUpdate(
    req.parmas.firmwareVersionId,
    {
      name: versionName,
      gitUrl,
      description: versionDescription,
      filename: req.files.file ? filename : testFirmwareVersion.filename,
      editedAt: Date.now(),
      editedBy: req.user.id,
    }
  );
  res.status(204).json();
});

// GET /api/firmwareVersion/:firmwareVersionId (testing)
exports.getVersionDetail = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.firmwareVersionId))
    return next(new AppError("Invalid firmwareVersionId", 400));

  const testFirmwareVersion = await FirmwareVersion.findById(
    req.params.firmwareVersionId
  );

  if (!testFirmwareVersion)
    return next(new AppError("Firmware Version not found", 404));

  const user = await User.findById(
    testFirmwareVersion.editedBy
      ? testFirmwareVersion.editedBy
      : testFirmwareVersion.createdBy
  );
  if (!user) return new AppError("User not found", 404);

  const formatOutput = {
    id: testFirmwareVersion._id,
    name: testFirmwareVersion.name,
    description: testFirmwareVersion.description,
    lastUpdate: testFirmwareVersion.editedAt
      ? testFirmwareVersion.editedAt
      : testFirmwareVersion.createdAt,
    updatedBy: user.name,
    file: process.env.AWS_S3_URL + testFirmwareVersion.filename,
    fileExtension: testFirmwareVersion.fileExtension,
  };

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});
