const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const checkCollab = require("./../utils/checkCollab");

const Collaborator = require("./../models/collaboratorModel");
const Phase = require("./../models/phaseModel");
const Permission = require("./../models/permissionModel");
const Project = require("./../models/projectModel");
const User = require("./../models/userModel");
const PhaseApi = require("../models/phaseApiModel");
const Message = require("../models/messageModel");
const DevicePhase = require("../models/devicePhaseModel");
const Device = require("../models/deviceModel");
const Mark = require("../models/markModel");
const Area = require("../models/areaModel");
const Gateway = require("../models/gatewayModel");
const DeviceFirmware = require("../models/deviceFirmwareModel");
const DeviceType = require("../models/deviceTypeModel");

const Upload = require("./../utils/upload");
const fs = require("fs");
var csv = require("csv-express");

const createCsvWriter = require("csv-writer").createObjectCsvWriter;

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
  return id1.toString() === id2.toString();
};

// POST /api/project/:projectId/phase (finished)
exports.createPhase = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  if (!req.fields.name) return next(new AppError("Phase required name.", 400));

  // Check permission wheather use has permission to create new phase
  await checkCollab(
    next,
    req.params.projectId,
    req.user._id,
    "You do not have permission to create a new phase.",
    "owner",
    "can_edit"
  );

  const newPhase = await Phase.create({
    name: req.fields.name,
    startedAt: req.fields.startedAt || Date.now(),
    projectId: req.params.projectId,
    createdAt: Date.now(),
    createdBy: req.user._id,
    editedAt: Date.now(),
    editedBy: req.user._id,
  });

  // Create default phaseApi (lattitude, longitude, temperature, battery)

  const lattitudeApi = await PhaseApi.create({
    phaseId: newPhase._id,
    name: "latitude",
    dataType: "Number",
    description: "latitude of device",
  });

  const longitudeApi = await PhaseApi.create({
    phaseId: newPhase._id,
    name: "longitude",
    dataType: "Number",
    description: "longitude of device",
  });

  const temperatureApi = await PhaseApi.create({
    phaseId: newPhase._id,
    name: "temperature",
    dataType: "Number",
  });

  const batteryApi = await PhaseApi.create({
    phaseId: newPhase._id,
    name: "battery",
    dataType: "Number",
  });

  const dateApi = await PhaseApi.create({
    phaseId: newPhase._id,
    name: "createdAt",
    dataType: "Date",
  });

  res.status(201).json();
});

// PATCH /api/phase/:phaseId/status (finished)
exports.phaseStatus = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 403));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  // Check permission wheather use has permission to delete phase
  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You do not have permission to change phase stauts.",
    "owner",
    "can_edit"
  );

  if (req.fields.isActive)
    return next(new AppError("You cannot change phase to active", 400));

  if (req.fields.isActive) {
    // กู้คืน
    const updatedPhase = await Phase.findOneAndUpdate(
      { _id: req.params.phaseId },
      {
        isActive: true,
        editedAt: Date.now(),
        editedBy: req.user._id,
        endedAt: null,
      }
    );
  } else {
    // Archived
    const updatedPhase = await Phase.findOneAndUpdate(
      { _id: req.params.phaseId },
      {
        isActive: false,
        editedAt: Date.now(),
        editedBy: req.user._id,
        endedAt: Date.now(),
      }
    );
  }

  // Change device phase to archived
  const devicePhases = await DevicePhase.updateMany(
    { phaseId: req.params.phaseId },
    { status: "archived" }
  );
  const testDevicePhases = await DevicePhase.find({
    phaseId: req.params.phaseId,
  });

  // Change device status to active
  for (const device of testDevicePhases) {
    await Device.updateMany({ _id: device.deviceId }, { status: "available" });
  }

  res.status(204).json();
});

// DELETE /api/phase/:phaseId (finished)
exports.deleted = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 404));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  // Check permission wheather use has permission to delete phase
  await checkCollab(
    next,
    project._id,
    req.user._id,
    "You do not have permission to delete phase.",
    "owner",
    "can_edit"
  );

  // Delete message and devicePhase

  const devicePhases = await DevicePhase.find({
    phaseId: phase._id,
  }).populate("deviceId");

  for (const devicePhase of devicePhases) {
    const type = await DeviceType.findById(devicePhase.deviceId.type);
    if (type.name === "gateway") {
      await Gateway.deleteMany({ gatewayId: devicePhase.deviceId._id });
    }
    await DevicePhase.deleteMany({ _id: devicePhase.deviceId });

    // Delete devicephase message
    await Message.deleteMany({ "metadata.devicePhaseId": devicePhase._id });

    // Delete deviceFirmware
    await DeviceFirmware.deleteMany({ devicePhaseId: devicePhase._id });

    await Device.findByIdAndUpdate(devicePhase.deviceId, {
      status: "available",
    });
  }
  await Mark.deleteMany({ phaseId: phase._id });
  await Area.deleteMany({ phaseId: phase._id });
  await PhaseApi.deleteMany({ phaseId: phase._id });
  await Phase.findByIdAndUpdate(phase._id, {
    isActive: false,
    isDeleted: true,
    deletedAt: Date.now(),
  });

  await Phase.findByIdAndUpdate(req.params.phaseId, {
    isDeleted: true,
    deletedAt: Date.now(),
    isActive: false,
  });

  res.status(204).json();
});

// GET /api/phase/:phaseId (finished)
exports.getInfo = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findOne({ _id: req.params.phaseId });

  if (!phase) return next(new AppError("Phase not found", 404));
  if (phase.isDeleted) return next(new AppError("Phase has been deleted", 400));

  const project = await Project.findById(phase.projectId);
  if (!project) return next(new AppError("Project not found", 404));

  const owner = await User.findById(phase.createdBy);

  // Get phase permission
  const collaborator = await Collaborator.findOne({
    projectId: project._id,
    userId: req.user._id,
  });

  await checkCollab(
    next,
    project._id,
    req.user.id,
    "You cannot access this phase.",
    "owner",
    "can_edit",
    "can_view"
  );

  if (!collaborator) return next(new AppError("Collaborator not found", 404));

  const permission = await Permission.findById(collaborator.permissionId);

  if (!permission) return next(new AppError("Permission not found", 404));

  // ถ้า project archived แล้วให้ส่ง isProjectArchived

  if (project.isArchived) {
  }
  res.status(200).json({
    status: "success",
    data: {
      id: phase._id,
      name: phase.name,
      ownerName: owner.name,
      startedAt: phase.startedAt,
      endedAt: phase.endedAt,
      permission: permission.name,
      isProjectArchived: project.isArchived,
      isActive: phase.isActive,
      permission: permission.name,
      description: phase.description,
    },
  });
});

// GET /api/phase/:phaseId (finished)
exports.getPhases = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.projectId))
    return next(new AppError("Invalid projectId", 400));

  const match = {};
  if (req.query.type === "finished") {
    match["isActive"] = false;
  } else if (req.query.type === "all") {
  } else {
    match["isActive"] = true;
  }
  const phases = await Phase.aggregate([
    {
      $match: {
        projectId: new mongoose.Types.ObjectId(req.params.projectId),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $match: match,
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: "$name",
        owner: "$owner.name",
        isActive: "$isActive",
        startedAt: "$startedAt",
        endedAt: "$endedAt",
      },
    },
    {
      $sort: { startedAt: 1 },
    },
  ]);
  res.status(200).json({
    status: "success",
    data: phases,
  });
});

// PATCH /api/phase/:phaseId (finished)
exports.editPhase = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 404));

  await Phase.findByIdAndUpdate(req.params.phaseId, { ...req.fields });

  res.status(204).json();
});

// GET /api/phase/:phaseId/csv (finished)
exports.downloadCsv = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const phase = await Phase.findById(req.params.phaseId);
  if (!phase) return next(new AppError("Phase not found", 404));

  // Create csv file
  const headers = [];
  let apis = [];

  if (Object.keys(req.fields).length === 0) {
    apis = await PhaseApi.find({
      phaseId: req.params.phaseId,
    });
    for (const api of apis) {
      headers.push({
        id: `${api.name}`,
        title: `${api.name}`,
      });
    }

    headers.push({
      id: "createdAt",
      title: "createdAt",
    });

    headers.push({
      id: "recievedAt",
      title: "recievedAt",
    });

    headers.push({
      id: "deviceName",
      title: "deviceName",
    });

    headers.push({
      id: "aliasName",
      title: "aliasName",
    });
  } else {
    if (!req.fields.other || req.fields.other.length === 0) {
      apis = await PhaseApi.find({
        phaseId: req.params.phaseId,
      });
      for (const api of apis) {
        headers.push({
          id: `${api.name}`,
          title: `${api.name}`,
        });
      }
    } else {
      apis = await PhaseApi.find({
        phaseId: req.params.phaseId,
        _id: { $in: req.fields.other.map((obj) => obj.id) },
      });

      for (const api of req.fields.other) {
        if (apis.find((obj) => compareId(obj._id, api.id))) {
          headers.push({
            id: `${apis.filter((obj) => compareId(obj._id, api.id))[0].name}`,
            title: `${api.name}`,
          });
        }
      }
    }

    if (req.fields.createdAt.isIncluded) {
      headers.push({
        id: "createdAt",
        title: req.fields.createdAt.name,
      });
    }

    if (req.fields.recievedAt.isIncluded) {
      headers.push({
        id: "recievedAt",
        title: req.fields.recievedAt.name,
      });
    }
    if (req.fields.deviceName.isIncluded) {
      headers.push({
        id: "deviceName",
        title: req.fields.deviceName.name,
      });
    }
    if (req.fields.aliasName.isIncluded) {
      headers.push({
        id: "aliasName",
        title: req.fields.aliasName.name,
      });
    }
  }

  const allMessages = [];
  if (req.query.option === "combine") {
    const devicePhases = await DevicePhase.find({
      phaseId: req.params.phaseId,
    });
    for (const devicePhase of devicePhases) {
      let messages = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              devicePhase._id
            ),
          },
        },
        {
          $lookup: {
            from: "devicephases", // replace with the name of your collection
            localField: "metadata.devicePhaseId",
            foreignField: "_id",
            as: "metadata.devicePhaseId",
          },
        },
        {
          $unwind: "$metadata.devicePhaseId",
        },
        {
          $addFields: {
            aliasName: "$metadata.devicePhaseId.alias",
          },
        },
        {
          $lookup: {
            from: "devices", // replace with the name of your collection
            localField: "metadata.devicePhaseId.deviceId",
            foreignField: "_id",
            as: "metadata.devicePhaseId.deviceId",
          },
        },
        {
          $unwind: "$metadata.devicePhaseId.deviceId",
        },
        {
          $addFields: {
            deviceName: "$metadata.devicePhaseId.deviceId.name",
          },
        },
      ]);
      allMessages.push(...messages);
    }
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
  } else if (req.query.option === "separate" && req.query.devicePhaseId) {
    const testDevicePhase = await DevicePhase.findById(req.query.devicePhaseId);
    if (!testDevicePhase)
      return next(new AppError("DevicePhase not found", 404));
    let messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            testDevicePhase._id
          ),
        },
      },
      {
        $lookup: {
          from: "devicephases", // replace with the name of your collection
          localField: "metadata.devicePhaseId",
          foreignField: "_id",
          as: "metadata.devicePhaseId",
        },
      },
      {
        $unwind: "$metadata.devicePhaseId",
      },
      {
        $addFields: {
          aliasName: "$metadata.devicePhaseId.alias",
        },
      },
      {
        $lookup: {
          from: "devices", // replace with the name of your collection
          localField: "metadata.devicePhaseId.deviceId",
          foreignField: "_id",
          as: "metadata.devicePhaseId.deviceId",
        },
      },
      {
        $unwind: "$metadata.devicePhaseId.deviceId",
      },
      {
        $addFields: {
          deviceName: "$metadata.devicePhaseId.deviceId.name",
        },
      },
    ]);
    allMessages.push(...messages);
  }

  const formatOutput = [];
  for (const message of allMessages) {
    const temp = {};
    for (const header of headers) {
      temp[header.title] = message[header.title];
    }
    formatOutput.push(temp);
  }

  // const csvWriter = createCsvWriter({
  //   path: "out.csv",
  //   header: headers,
  // });
  // await csvWriter.writeRecords(allMessages);
  // res.setHeader("Content-Type", "text/csv");
  // res.setHeader("Content-Disposition", "attachment; filename=out.csv");
  // res.sendFile("out.csv", { root: "./" }, (err) => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     fs.unlinkSync("out.csv");
  //   }
  // });
  res.csv(formatOutput, true);
});
