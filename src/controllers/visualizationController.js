const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Device = require("../models/deviceModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const Phase = require("../models/phaseModel");
const DeviceType = require("../models/deviceTypeModel");

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
    return id1.toString() == id2.toString();
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

const findAverage = (datas, dataPoints, dataType) => {
  const data = [];
  const labels = [];
  const groupNumber = Math.floor(datas.length / dataPoints);
  console.log(groupNumber);
  console.log(data.length);
  for (let i = 0; i < dataPoints; i++) {
    let group = datas.slice(i * groupNumber, (i + 1) * groupNumber);
    if (i === dataPoints - 1) {
      group = datas.slice(i * groupNumber);
    }
    let sum = 0;
    let count = 0;
    // console.log(group);
    for (const message of group) {
      console.log(message);
      sum += message[`${dataType}`] ? message[`${dataType}`] : 0;

      if (message[`${dataType}`]) count++;
    }
    const avg = sum / count;
    data.push(avg);
    labels.push(new Date(group[0].timestamp));
  }
  console.log(data);

  return { data, labels };
};

// GET /api/devicePhase/:devicePhaseId/graph?type&range&points
// Get data from message and send into graph x, y axis
exports.getDeviceGraph = catchAsync(async (req, res, next) => {
  // Check if devicePhaseId is valid
  const dataPoints = req.query.point * 1 || 5;

  if (!isValidObjectId(req.params.devicePhaseId))
    return next(new AppError("Invalid devicePhaseId", 400));

  const devicePhase = await DevicePhase.findById(req.params.devicePhaseId);
  if (!devicePhase) return next(new AppError("Invalid devicePhaseId", 400));

  if (req.query.type !== "temperature" && req.query.type !== "battery") {
    return next(new AppError("Invalid type", 400));
  }
  // Check is message is cover range of time

  const messages = await Message.aggregate([
    {
      $match: {
        "metadata.devicePhaseId": new mongoose.Types.ObjectId(
          req.params.devicePhaseId
        ),
      },
    },
    {
      $group: {
        _id: null,
        min: { $min: "$timestamp" },
        max: { $max: "$timestamp" },
      },
    },
  ]);

  let data = [];
  let labels = [];
  if (
    req.query.range === "month" &&
    new Date(messages[0].max) - new Date(messages[0].min) >
      30 * 24 * 60 * 60 * 1000
  ) {
    // Get message from last 30 days and find average of temperature by dividing range by dataPoints

    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          min: { $min: "$timestamp" },
          max: { $max: "$timestamp" },
        },
      },
    ]);

    const result = findAverage(messages, dataPoints, req.query.type);
    data = result.data;
    labels = result.labels;
  } else if (
    req.query.range === "week" &&
    new Date(messages[0].max) - new Date(messages[0].min) >
      7 * 24 * 60 * 60 * 1000
  ) {
    // Get message from last 7 days

    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          min: { $min: "$timestamp" },
          max: { $max: "$timestamp" },
        },
      },
    ]);
    const result = findAverage(messages, dataPoints, req.query.type);
    data = result.data;
    labels = result.labels;
  } else if (
    req.query.range === "day" &&
    new Date(messages[0].max) - new Date(messages[0].min) > 24 * 60 * 60 * 1000
  ) {
    // Get message from last 24 hours

    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: null,
          min: { $min: "$timestamp" },
          max: { $max: "$timestamp" },
        },
      },
    ]);
    const result = findAverage(messages, dataPoints, req.query.type);
    data = result.data;
    labels = result.labels;
  } else if (
    req.query.range === "hour" &&
    new Date(messages[0].max) - new Date(messages[0].min) > 60 * 60 * 1000
  ) {
    // Get message from last 60 minutes

    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - 60 * 60 * 1000),
          },
        },
      },
    ]);

    const result = findAverage(messages, dataPoints, req.query.type);
    data = result.data;
    labels = result.labels;
  } else if (
    req.query.range === "minute" &&
    new Date(messages[0].max) - new Date(messages[0].min) > 60 * 1000
  ) {
    // Get message from last 60 seconds

    const messages = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - 60 * 1000),
          },
        },
      },
    ]);

    const result = findAverage(messages, dataPoints, req.query.type);
    data = result.data;
    labels = result.labels;
  } else {
    return next(new AppError("Not enough data", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      y: data,
      x: labels,
    },
  });
});

// GET /api/phase/:phaseId/visualization
exports.getDashboard = catchAsync(async (req, res, next) => {
  res.status(200).json();
});

// POST /api/phase/:phaseId/visualization
exports.createDashboard = catchAsync(async (req, res, next) => {
  res.status(201).json();
});

// PATCH /api/vizualization/:visualizationId
exports.editDashboard = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// PUT /api/phase/:phaseId/visualization
exports.editLayout = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// DELETE /api/vizualization/:visualizationId
exports.deleteDashboard = catchAsync(async (req, res, next) => {
  res.status(204).json();
});

// GET /api/phase/:phaseId/visualization/device
exports.getDeviceVisualization = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));
  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Invalid phaseId", 400));

  const devicePhase = await DevicePhase.find({
    phaseId: req.params.phaseId,
  }).populate("deviceId");

  let activeGateway = [];
  let activeStandalone = [];
  let activeNode = [];
  let gatewayCount = 0;
  let standaloneCount = 0;
  let nodeCount = 0;
  let totalMinute = 0;

  const gatewayTypeId = await DeviceType.findOne({ name: "gateway" });
  const standaloneTypeId = await DeviceType.findOne({ name: "standalone" });
  const nodeTypeId = await DeviceType.findOne({ name: "node" });

  for (const device of devicePhase) {
    if (compareId(device.deviceId.type, gatewayTypeId._id)) gatewayCount++;
    else if (compareId(device.deviceId.type, standaloneTypeId._id))
      standaloneCount++;
    else nodeCount++;

    if (device.status === "active" && device.lastConnection) {
      // Calculate number massge per minute by devicePhaseId

      const messages = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(device._id),
          },
        },
        {
          $group: {
            _id: null,
            min: { $min: "$timestamp" },
            max: { $max: "$timestamp" },
            total: { $sum: 1 },
          },
        },
      ]);

      if (messages.length > 0) {
        const totalMessages = messages[0].total;
        const startTime = new Date(messages[0].min);
        const endTime = new Date(messages[0].max);
        // Minutes between startTime and endTime
        const diffInMinutes = (endTime - startTime) / (1000 * 60);

        if (diffInMinutes > 0) {
          var avgMessagesPerMinute = totalMessages / diffInMinutes;
          totalMinute += avgMessagesPerMinute;
        }
      }

      if (compareId(device.deviceId.type, gatewayTypeId._id)) {
        activeGateway.push(device);
      } else if (compareId(device.deviceId.type, standaloneTypeId._id)) {
        activeStandalone.push(device);
      } else {
        activeNode.push(device);
      }
    }
  }

  // console.log(activeGateway);

  res.status(200).json({
    status: "success",
    data: {
      gateway: {
        active: activeGateway.length,
        total: gatewayCount,
      },
      standalone: {
        active: activeStandalone.length,
        total: standaloneCount,
      },
      node: {
        active: activeNode.length,
        total: nodeCount,
      },
      messagePerMinute:
        totalMinute /
        (activeGateway.length + activeStandalone.length + activeNode.length),
    },
  });
});