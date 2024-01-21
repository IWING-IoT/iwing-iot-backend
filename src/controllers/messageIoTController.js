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
const Area = require("../models/areaModel");

/**
 * @return {boolean} true if (lng, lat) is in bounds
 */
const contains = (bounds, lat, lng) => {
  //https://rosettacode.org/wiki/Ray-casting_algorithm
  var count = 0;
  for (var b = 0; b < bounds.length; b++) {
    var vertex1 = bounds[b];
    var vertex2 = bounds[(b + 1) % bounds.length];
    if (west(vertex1, vertex2, lng, lat)) ++count;
  }
  return count % 2;

  /**
   * @return {boolean} true if (x,y) is west of the line segment connecting A and B
   */
  function west(A, B, x, y) {
    if (A[0] <= B[0]) {
      if (y <= A[0] || y > B[0] || (x >= A[1] && x >= B[1])) {
        return false;
      } else if (x < A[1] && x < B[1]) {
        return true;
      } else {
        return (y - A[0]) / (x - A[1]) > (B[0] - A[0]) / (B[1] - A[1]);
      }
    } else {
      return west(B, A, x, y);
    }
  }
};

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

  // Check if device is active
  if (testDevicePhase.status !== "active")
    return next(new AppError("Device is not active", 400));

  const apis = await PhaseApi.find({ phaseId: testDevicePhase.phaseId });

  const formatData = {};
  for (const api of apis) {
    formatData[`${api.name}`] = req.fields[`${api.name}`];
  }

  // Receive message for testing
  // Random plus time to receiveAt
  let recievedAt;
  if (req.fields.simulate && req.fields.simulate === true) {
    let date = new Date(req.fields.createdAt);
    recievedAt = new Date(date.getTime() + Math.random() * 1000);
  } else {
    recievedAt = Date.now();
  }

  console.log(formatData);

  // await Message.create({
  //   metadata: {
  //     devicePhaseId: decoded.devicePhaseId,
  //   },
  //   timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
  //   recievedAt,
  //   ...formatData,
  // });

  // await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
  //   messageReceive: ++testDevicePhase.messageReceive,
  //   lastConnection: Date.now(),
  //   temperature: formatData[`temperature`]
  //     ? formatData[`temperature`]
  //     : testDevicePhase.temperature,
  //   battery: formatData[`battery`]
  //     ? formatData[`battery`]
  //     : testDevicePhase.battery,
  // });
  res.status(201).json();

  //// Check if point is in area
  // reference : https://rosettacode.org/wiki/Ray-casting_algorithm#JavaScript

  const areas = await Area.find({
    phaseId: testDevicePhase.phaseId,
    isActive: true,
  });

  for (const area of areas) {
    // If outside but old state is inside change state to outside
    if (
      !contains(area.coordinates, req.fields.latitude, req.fields.longitude) &&
      !testDevicePhase.isOutside
    ) {
      testDevicePhase.isOutside = true;
      area.alert += 1;
      area.save();
    } else if (
      contains(area.coordinates, req.fields.latitude, req.fields.longitude) &&
      testDevicePhase.isOutside
    ) {
      testDevicePhase.isOutside = false;
      area.save();
    }
  }
  testDevicePhase.save();
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

  // Check if device is active
  if (testDevicePhase.status !== "active")
    return next(new AppError("Device is not active", 400));

  if (req.fields.nodeAlias) {
    // From Node
    const testNode = await DevicePhase.findOne({
      phaseId: testDevicePhase.phaseId,
      alias: req.fields.nodeAlias,
    });

    if (!testNode) return next(new AppError("Node not found", 404));

    // Check if device is active
    if (testNode.status !== "active")
      return next(new AppError("Device is not active", 400));

    const apis = await PhaseApi.find({ phaseId: testDevicePhase.phaseId });

    const formatData = {};

    for (const api of apis) {
      formatData[`${api.name}`] = req.fields[`${api.name}`];
    }
    console.log(formatData);

    // Update Node
    await DevicePhase.findByIdAndUpdate(testNode._id, {
      messageReceive: ++testDevicePhase.messageReceive,
      lastConnection: Date.now(),
      temperature: formatData[`temperature`]
        ? formatData[`temperature`]
        : testDevicePhase.temperature,
      battery: formatData[`battery`]
        ? formatData[`battery`]
        : testDevicePhase.battery,
    });

    // Create node message
    await Message.create({
      metadata: {
        devicePhaseId: testNode._id,
      },
      timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
      recievedAt: Date.now(),
      ...formatData,
    });

    // Update gateway
    await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
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
    const formatData = {};
    await DevicePhase.findByIdAndUpdate(decoded.devicePhaseId, {
      messageReceive: ++testDevicePhase.messageReceive,
      lastConnection: Date.now(),
      temperature: formatData[`temperature`]
        ? formatData[`temperature`]
        : testDevicePhase.temperature,
      battery: formatData[`battery`]
        ? formatData[`battery`]
        : testDevicePhase.battery,
    });

    // Create gateway message

    await Message.create({
      metadata: {
        devicePhaseId: decoded.devicePhaseIds,
      },
      timestamp: req.fields.createdAt ? req.fields.createdAt : Date.now(),
      recievedAt: Date.now(),
      temperature: req.fields.temperature,
      battery: req.fields.battery,
      latitude: null,
      longitude: null,
    });
  }

  res.status(201).json();

  //// Check if point is in area
  // reference : https://rosettacode.org/wiki/Ray-casting_algorithm#JavaScript

  // Check if this request from nodes
  if (req.fields.nodeAlias) {
    const areas = await Area.find({
      phaseId: testDevicePhase.phaseId,
      isActive: true,
    });

    for (const area of areas) {
      // If outside but old state is inside change state to outside
      if (
        !contains(
          area.coordinates,
          req.fields.latitude,
          req.fields.longitude
        ) &&
        !testDevicePhase.isOutside
      ) {
        testDevicePhase.isOutside = true;
        area.alert += 1;
        area.save();
      } else if (
        contains(area.coordinates, req.fields.latitude, req.fields.longitude) &&
        testDevicePhase.isOutside
      ) {
        testDevicePhase.isOutside = false;
        area.save();
      }
    }
    testDevicePhase.save();
  }
});
