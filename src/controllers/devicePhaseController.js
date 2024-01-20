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

const { sign } = require("crypto");
const jwt = require("jsonwebtoken");
const {
  ListBucketInventoryConfigurationsOutputFilterSensitiveLog,
} = require("@aws-sdk/client-s3");

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

// POST /api/phase/:phaseId/device (finished)
exports.addDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to add device.",
    "can_edit",
    "owner"
  );

  for (const device of req.fields) {
    const testDevice = await Device.findById(device.id);
    if (!testDevice) continue;
    if (testDevice.status !== "available") continue;
    let devicePhaseCreate = await DevicePhase.create({
      deviceId: testDevice._id,
      phaseId: req.params.phaseId,
      alias: device.alias && device.alias !== "" ? device.alias : "",
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

    testDevice.status = "inuse";
    testDevice.save();
  }

  res.status(201).json();
});

// GET /api/phase/:phaseId/device (finished)
exports.getDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission get device.",
    "can_edit",
    "owner",
    "can_view"
  );

  const match = {};
  if (req.query.type && !req.query.type !== "all") {
    match[`deviceType.name`] = req.query.type;
  }

  const devicePhases = await DevicePhase.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "deviceId",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $unwind: "$device",
    },
    {
      $lookup: {
        from: "devicetypes",
        localField: "device.type",
        foreignField: "_id",
        as: "deviceType",
      },
    },
    {
      $unwind: "$deviceType",
    },
    {
      $match: match,
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        type: "$deviceType.name",
        name: "$device.name",
        alias: 1,
        status: 1,
        battery: 1,
        temperature: 1,
        lastConnection: 1,
        jwt: 1,
        categoryDataId: 1,
      },
    },
  ]);

  for (const device of devicePhases) {
    device.lastCommunuication = device.lastConnection;
    delete device.lastConnection;
    // Update categoryDataId if enntiy not exist
    const editedEntity = [];
    const associate = [];

    for (const entity of device.categoryDataId) {
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

    await DevicePhase.findByIdAndUpdate(device.id, {
      categoryDataId: editedEntity,
    });
    device.associate = associate;
    delete device.categoryDataId;
  }

  res.status(200).json({
    status: "success",
    data: devicePhases,
  });
});

// PATCH /api/devicePhase/:devicePhaseId/status (finished)
exports.deviceStatus = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const testPhase = await Phase.findById(testDevicePhase.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));

  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to change device status.",
    "can_edit",
    "owner"
  );

  if (testDevicePhase.status === "archived")
    return next(new AppError("Cannot change archived device status", 400));

  await DevicePhase.findByIdAndUpdate(req.params.devicePhaseId, {
    status: req.fields.isActive ? "active" : "inactive",
    editedAt: Date.now(),
    editedBy: req.user.id,
  });
  res.status(204).json();
});

// DELETE /api/devicePhase/:devicePhaseId (finished)
exports.removeDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const testPhase = await Phase.findById(testDevicePhase.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));
  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to delete device.",
    "can_edit",
    "owner"
  );

  const updatedDevice = await Device.findById(testDevicePhase.deviceId);
  if (!updatedDevice) return next(new AppError("Device not found", 404));

  await Device.findByIdAndUpdate(updatedDevice._id, { status: "available" });
  await DevicePhase.findByIdAndDelete(req.params.devicePhaseId);

  res.status(204).json();
});

// PATCH /api/devicePhase/:devicePhaseId/jwt (finished)
exports.generateJwt = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));
  console.log(`req.params.devicePhaseId : ${req.params.devicePhaseId}`);

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const testPhase = await Phase.findById(testDevicePhase.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));
  console.log(testPhase._id);

  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission get device.",
    "can_edit",
    "owner"
  );

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
  const dataPointX = 20;
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const testDevice = await Device.findById(testDevicePhase.deviceId);

  const testDeviceType = await DeviceType.findById(testDevice.type);

  const formatOutput = {
    id: testDevicePhase._id,
    status: testDevicePhase.status,
    name: testDevice.name,
    alias: testDevicePhase.alias,
    battery: testDevicePhase.battery,
    temperature: testDevicePhase.temperature,
    lastCommunuication: testDevicePhase.lastConnection,
    jwt: testDevicePhase.jwt,
    type: testDeviceType.name,
  };

  // Update categoryDataId if enntiy not exist
  const editedEntity = [];
  const associate = [];

  for (const entity of testDevicePhase.categoryDataId) {
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

  await DevicePhase.findByIdAndUpdate(testDevicePhase.id, {
    categoryDataId: editedEntity,
  });

  formatOutput.associate = associate;

  // // Temperature
  // // Get data point
  // const xTemperature = [];
  // const yTemperature = [];

  // const messages = await Message.find({
  //   "metadata.devicePhaseId": req.params.devicePhaseId,
  // }).sort({ timestamp: -1 });

  res.status(200).json({
    status: "success",
    data: formatOutput,
  });
});

// GET /api/devicePhase/:devicePhaseId/stat
exports.getDeviceStat = catchAsync(async (req, res, next) => [
  res.status(200).json(),
]);

// PATCH /api/devicePhase/:devicePhaseId (testing)
exports.editDevice = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  const testPhase = await Phase.findById(testDevicePhase.phaseId);
  if (!testPhase) return next(new AppError("Phase not found", 404));
  await checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to edit device.",
    "can_edit",
    "owner"
  );

  if (req.fields.alias) {
    await DevicePhase.findByIdAndUpdate(req.params.devicePhaseId, {
      alias: req.fields.alias,
    });
  }

  if (req.fields.associate) {
    const validEntry = [];
    // Check if type of entry id is correct
    for (const associate of req.fields.associate) {
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

// GET /api/devicePhase/:devicePhaseId/gateway (testing)
exports.getNodesGateway = catchAsync(async (req, res, next) => {
  // Check if devicePhaseId is valid
  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));
  // Check if devicePhaseId is valid
  const testDevicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  // If devicePhaseId is not found return error
  if (!testDevicePhase) return next(new AppError("DevicePhase not found", 404));

  // Check if devicePhaseId is gateway
  const testDevice = await Device.findById(testDevicePhase.deviceId);
  if (!testDevice) return next(new AppError("Device not found", 404));
  const testDeviceType = await DeviceType.findById(testDevice.type);
  if (testDeviceType.name !== "gateway")
    return next(new AppError("Device is not gateway", 400));

  let nodesList = await Gateway.find(
    {
      gatewayId: testDevicePhase._id,
    },
    { nodeId: 1, _id: 0 }
  );

  nodesList = nodesList.map((node) => node.nodeId);
  console.log(nodesList);

  nodesList = nodesList.map((id) => new mongoose.Types.ObjectId(id));

  const devicePhases = await DevicePhase.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(testDevicePhase.phaseId),
        _id: { $in: nodesList },
      },
    },
    {
      $lookup: {
        from: "devices",
        localField: "deviceId",
        foreignField: "_id",
        as: "device",
      },
    },
    {
      $unwind: "$device",
    },
    {
      $lookup: {
        from: "devicetypes",
        localField: "device.type",
        foreignField: "_id",
        as: "deviceType",
      },
    },
    {
      $unwind: "$deviceType",
    },
    {
      $project: {
        id: "$_id",
        _id: 0,
        type: "$deviceType.name",
        name: "$device.name",
        alias: 1,
        status: 1,
        battery: 1,
        temperature: 1,
        lastConnection: 1,
        jwt: 1,
        categoryDataId: 1,
      },
    },
  ]);

  for (const device of devicePhases) {
    device.lastCommunuication = device.lastConnection;
    delete device.lastConnection;
    // Update categoryDataId if enntiy not exist
    const editedEntity = [];
    const associate = [];

    for (const entity of device.categoryDataId) {
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

    await DevicePhase.findByIdAndUpdate(device.id, {
      categoryDataId: editedEntity,
    });
    device.associate = associate;
    delete device.categoryDataId;
  }

  // Sort devicePhases by lastCommunication
  devicePhases.sort((a, b) => {
    return b.lastCommunuication - a.lastCommunuication;
  });

  res.status(200).json({
    status: "success",
    data: devicePhases,
  });
});
