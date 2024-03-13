const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const checkCollab = require("./../utils/checkCollab");

const Phase = require("./../models/phaseModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const Area = require("../models/areaModel");
const CategoryEntity = require("../models/categoryEntityModel");
const Attribute = require("../models/attributeModel");
const AttributeValue = require("../models/attributeValueModel");
const Device = require("../models/deviceModel");
const Mark = require("../models/markModel");

const turf = require("@turf/turf");
const de9im = require("de9im");
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

// Validate coordinates using Turf.js
const validateCoordinates = (coordinates) => {
  // Ensure at least 3 coordinates are provided
  if (coordinates.length < 3) {
    return false;
  }

  // Ensure the first and last coordinates are the same
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push(coordinates[0]);
  }

  return true;
};

const validateLatLong = (lat, long) => {
  if (lat < -90 || lat > 90 || long < -180 || long > 180) {
    return false;
  }
  return true;
};

// GET /api/phase/:phaseId/map/position (testing)
exports.getMapPosition = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const formatOutput = [];

  const devicePhases = await DevicePhase.find({
    phaseId: req.params.phaseId,
  }).populate("deviceId");
  for (const devicePhase of devicePhases) {
    const message = await Message.find({
      "metadata.devicePhaseId": devicePhase._id,
      createdAt: {
        $lte: req.query.time
          ? new Date(req.query.time.split(" ")[0])
          : new Date(),
      },
    })
      .sort({ timestamp: -1 })
      .limit(1);

    if (message && message.length === 1) {
      // // Update categoryDataId if enntiy not exist
      const editedEntity = [];
      const associate = [];

      for (const entity of devicePhase.categoryDataId) {
        const testEntity = await CategoryEntity.findById(entity);

        if (testEntity) {
          const mainAttribute = await Attribute.findOne({
            position: 0,
            categoryId: testEntity.categoryId,
          });

          const testmainAttributeValue = await AttributeValue.findOne({
            attributeId: mainAttribute._id,
            categoryEntityId: testEntity._id,
          });
          editedEntity.push(testEntity);
          associate.push({
            id: testEntity._id,
            name: testmainAttributeValue.value,
          });
        }
      }

      await DevicePhase.findByIdAndUpdate(devicePhase.id, {
        categoryDataId: editedEntity,
      });
      devicePhase.associate = associate;
      delete devicePhase.categoryDataId;

      // Type:
      const testDeviceType = await Device.findById(
        devicePhase.deviceId
      ).populate("type");

      formatOutput.push({
        id: devicePhase._id,
        name: devicePhase.deviceId.name,
        alias: devicePhase.alias,
        latitude: message[0].latitude,
        longitude: message[0].longitude,
        battery: message[0].battery,
        temperature: message[0].temperature,
        lastConnection: message[0].createdAt,
        associate,
        type: testDeviceType.type.name,
      });
    }
  }

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// GET /api/phase/:phaseId/map/path (testing)
exports.getMapPath = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const devicePhases = await DevicePhase.find({
    phaseId: req.params.phaseId,
  }).populate("deviceId");

  const formatOutput = [];
  for (const devicePhase of devicePhases) {
    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": devicePhase._id,
          createdAt: {
            $lte: req.query.endAt
              ? new Date(req.query.endAt.split(" ")[0])
              : new Date(),
            $gte: req.query.startAt
              ? new Date(req.query.startAt.split(" ")[0])
              : new Date(0),
          },
        },
      },
      { $sort: { timestamp: 1 } },
      {
        $project: {
          id: "$_id",
          _id: 0,
          latitude: 1,
          longitude: 1,
          createdAt: 1,
        },
      },
    ]);

    if (messages.length === 0) continue;

    formatOutput.push({
      id: devicePhase._id,
      name: devicePhase.deviceId.name,
      alias: devicePhase.alias,
      path: messages,
    });
  }

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// GET /api/phase/:phaseId/area (testing)
exports.getMapAreas = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const areas = await Area.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        coordinates: 1,
        isActive: 1,
        alert: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: areas,
  });
});

// GET /api/phase/:phaseId/area (testing)
exports.createArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to create new area.",
    "can_edit",
    "owner"
  );

  if (!req.fields.name || !req.fields.coordinates) {
    return next(new AppError("Invalid input", 400));
  }

  if (!validateCoordinates(req.fields.coordinates)) {
    return next(new AppError("Invalid coordinates", 400));
  }

  const newArea = await Area.create({
    name: req.fields.name,
    description: req.fields.description,
    phaseId: req.params.phaseId,
    coordinates: req.fields.coordinates,
    createdAt: new Date(),
    createdBy: req.user.id,
  });

  res.status(201).json();
});

// GET /api/area/:areaId (testing)
exports.getArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.params.areaId) },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        coordinates: 1,
        isActive: 1,
        alert: 1,
      },
    },
  ]);
  if (!area[0]) {
    return next(new AppError("Area not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: area[0],
  });
});

// PUT /api/area/:areaId (testing)
exports.editArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.findById(req.params.areaId);
  if (!area) {
    return next(new AppError("Area not found", 404));
  }
  const testPhase = await Phase.findById(area.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to edit area.",
    "can_edit",
    "owner"
  );

  if (!req.fields.name || !req.fields.coordinates) {
    return next(new AppError("Invalid input", 400));
  }

  if (!validateCoordinates(req.fields.coordinates)) {
    return next(new AppError("Invalid coordinates", 400));
  }

  area.name = req.fields.name;

  area.description = req.fields.description
    ? req.fields.description
    : area.description;
  area.coordinates = req.fields.coordinates;
  area.isActive = req.fields.isActive;
  area.editedAt = new Date();
  area.editedBy = req.user.id;
  await area.save();

  res.status(204).json();
});

// DELETE /api/area/:areaId (testing)
exports.deleteArea = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.areaId)) {
    return next(new AppError("Invalid areaId", 400));
  }
  const area = await Area.findById(req.params.areaId);
  if (!area) {
    return next(new AppError("Area not found", 404));
  }
  const testPhase = await Phase.findById(area.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to delete area.",
    "can_edit",
    "owner"
  );

  await Area.deleteOne({ _id: req.params.areaId });
  res.status(204).json();
});

// POST /api/phases/:phaseId/map/mark
exports.createMark = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }
  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to create new mark.",
    "can_edit",
    "owner"
  );

  if (!req.fields.latitude || !req.fields.longitude) {
    return next(new AppError("Invalid input", 400));
  }

  if (!validateLatLong(req.fields.latitude, req.fields.longitude)) {
    return next(new AppError("Invalid latitude or longitude", 400));
  }

  let testDevicePhase = null;
  // If has devicePhaseId
  if (req.fields.devicePhaseId) {
    if (!isValidObjectId(req.fields.devicePhaseId)) {
      return next(new AppError("Invalid devicePhaseId", 400));
    }
    testDevicePhase = await DevicePhase.findById(req.fields.devicePhaseId);
    if (!testDevicePhase) {
      return next(new AppError("DevicePhase not found", 404));
    }
    const testMark = await Mark.findOne({
      devicePhaseId: req.fields.devicePhaseId,
    });

    if (testMark) {
      return next(new AppError("DevicePhase already used", 400));
    }
  } else {
    if (!req.fields.name) {
      return next(new AppError("Invalid input", 400));
    }
  }

  const newMark = await Mark.create({
    name: req.fields.name ? req.fields.name : testDevicePhase.alias,
    description: req.fields.description,
    latitude: req.fields.latitude,
    longitude: req.fields.longitude,
    phaseId: req.params.phaseId,
    devicePhaseId: req.fields.devicePhaseId,
    createdAt: Date.now(),
    createdBy: req.user.id,
  });

  res.status(201).json();
});

// GET /api/phases/:phaseId/map/mark
exports.getMarks = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId)) {
    return next(new AppError("Invalid phaseId", 400));
  }

  const testPhase = Phase.findById(req.params.phaseId);
  if (!testPhase) {
    return next(new AppError("Phase not found", 404));
  }

  const marks = await Mark.aggregate([
    {
      $match: { phaseId: new mongoose.Types.ObjectId(req.params.phaseId) },
    },
    {
      $lookup: {
        from: "devicephases",
        localField: "devicePhaseId",
        foreignField: "_id",
        as: "devicePhase",
      },
    },
    {
      $unwind: {
        path: "$devicePhase",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "devicePhase.deviceId",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $unwind: {
        path: "$device",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "devicetypes",
        localField: "device.type",
        foreignField: "_id",
        as: "device.type",
      },
    },
    {
      $unwind: {
        path: "$device.type",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        name: 1,
        description: 1,
        latitude: 1,
        longitude: 1,
        devicePhaseId: "$devicePhase._id",
        devicePhaseName: "$devicePhase.alias",
        deviceName: "$device.name",
        deviceType: "$device.type.name",
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: marks,
  });
});

// PATCH /api/mark/:markId
exports.editMark = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.markId)) {
    return next(new AppError("Invalid markId", 400));
  }
  const mark = await Mark.findById(req.params.markId);
  if (!mark) {
    return next(new AppError("Mark not found", 404));
  }

  mark.name = req.fields.name ? req.fields.name : mark.name;
  mark.description = req.fields.description
    ? req.fields.description
    : mark.description;

  if (req.fields.latitude && req.fields.longitude) {
    if (!validateLatLong(req.fields.latitude, req.fields.longitude)) {
      return next(new AppError("Invalid latitude or longitude", 400));
    }
    mark.latitude = req.fields.latitude;
    mark.longitude = req.fields.longitude;
  }

  if (req.fields.devicePhaseId) {
    if (!isValidObjectId(req.fields.devicePhaseId)) {
      return next(new AppError("Invalid devicePhaseId", 400));
    }
    const testDevicePhase = DevicePhase.findById(req.fields.devicePhaseId);
    if (!testDevicePhase) {
      return next(new AppError("DevicePhase not found", 404));
    }
    mark.devicePhaseId = req.fields.devicePhaseId;
  }

  mark.editedAt = Date.now();
  mark.editedBy = req.user.id;
  await mark.save();

  res.status(204).json();
});

// DELETE /api/mark/:markId
exports.deleteMark = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.markId)) {
    return next(new AppError("Invalid markId", 400));
  }
  const mark = await Mark.findById(req.params.markId);
  if (!mark) {
    return next(new AppError("Mark not found", 404));
  }

  await Mark.deleteOne({ _id: req.params.markId });
  res.status(204).json();
});
