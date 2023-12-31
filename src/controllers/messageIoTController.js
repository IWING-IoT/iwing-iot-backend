const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const { appendFile } = require("fs");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const PhaseApi = require("../models/phaseApiModel");
const Gateway = require("../models/gatewayModel");

// POST /api/message/standalone
exports.createStandalone = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.log("Fail");
    return next(
      new AppError("You are not logged in, please log in to gain access.", 401)
    );
  }

  // Check if token is valid
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (
    !decoded.devicePhaseId ||
    !mongoose.isValidObjectId(decoded.devicePhaseId)
  )
    return next(new AppError("Invalid jwt token", 400));
  const testDevicePhase = await DevicePhase.findById(decoded.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("Invalid jwt token", 400));

  const apis = await PhaseApi.find({ phaseId: testDevicePhase.phaseId });

  const formatData = {};
  for (const api of apis) {
    formatData[`${api.name}`] = req.fields[`${api.name}`];
  }

  await Message.create({
    metadata: {
      devicePhaseId: decoded.devicePhaseId,
    },
    timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
    ...formatData,
  });

  await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
    messageReceive: ++testDevicePhase.messageReceive,
    lastConnection: Date.now(),
    temperature: formatData[`${temperature}`]
      ? formatData[`${temperature}`]
      : testDevicePhase.temperature,
    battery: formatData[`${battery}`]
      ? formatData[`${battery}`]
      : testDevicePhase.battery,
  });
  res.status(201).json();
});

// POST /api/message/gateway
exports.createGateway = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.log("Fail");
    return next(
      new AppError("You are not logged in, please log in to gain access.", 401)
    );
  }

  // Check if token is valid
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (
    !decoded.devicePhaseId ||
    !mongoose.isValidObjectId(decoded.devicePhaseId)
  )
    return next(new AppError("Invalid jwt token", 400));
  const testDevicePhase = await DevicePhase.findById(decoded.devicePhaseId);
  if (!testDevicePhase) return next(new AppError("Invalid jwt token", 400));

  if (req.fields.nodeAlias) {
    // From Node
    const testNode = await DevicePhase.findOne({
      phaseId: testDevicePhase.phaseId,
      alias: req.fields.nodeAlias,
    });

    if (!testNode) return next(new AppError("Node not found", 404));

    const apis = await PhaseApi.find({ phaseId: testDevicePhase.phaseId });

    const formatData = {};
    for (const api of apis) {
      formatData[`${api.name}`] = req.fields[`${api.name}`];
    }

    // Update Node
    await DevicePhase.findByIdAndUpdate(testNode._id, {
      messageReceive: ++testDevicePhase.messageReceive,
      lastConnection: Date.now(),
      temperature: formatData[`${temperature}`]
        ? formatData[`${temperature}`]
        : testDevicePhase.temperature,
      battery: formatData[`${battery}`]
        ? formatData[`${battery}`]
        : testDevicePhase.battery,
    });

    // Create node message
    await Message.create({
      metadata: {
        devicePhaseId: testNode._id,
      },
      timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
      ...formatData,
    });
    // Update gateway
    await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
      messageReceive: ++testDevicePhase.messageReceive,
      lastConnection: Date.now(),
    });

    // Update Gateway-node connection
    const testGateway = await Gateway.findOne({
      gatewayId: decoded.devicePhaseId,
      nodeId: testNode._id,
    });
    if (testGateway) {
      // Update Gateway-node last connection
      testGateway.lastConnection = Date.now();
      testGateway.save();
    } else {
      // Create new Gateway node connection
      await Gateway.create({
        gatewayId: decoded.devicePhaseId,
        nodeId: testNode._id,
        lastConnection: Date.now(),
      });
    }
  } else {
    // From Gateway
    // Update gateway metadata
    await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
      messageReceive: ++testDevicePhase.messageReceive,
      lastConnection: Date.now(),
      temperature: formatData[`${temperature}`]
        ? formatData[`${temperature}`]
        : testDevicePhase.temperature,
      battery: formatData[`${battery}`]
        ? formatData[`${battery}`]
        : testDevicePhase.battery,
    });

    // Create gateway message

    await Message.create({
      metadata: {
        devicePhaseId: decoded.devicePhaseIds,
      },
      timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
      temperature: req.fields.temperature,
      battery: req.fields.battery,
      lattitude: null,
      longtitude: null,
    });
  }

  res.status(201).json();
});
