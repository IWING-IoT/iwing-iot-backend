const mongoose = require("mongoose");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Device = require("../models/deviceModel");
const DevicePhase = require("../models/devicePhaseModel");
const Message = require("../models/messageModel");
const Phase = require("../models/phaseModel");
const DeviceType = require("../models/deviceTypeModel");
const checkCollab = require("../utils/checkCollab");
const { points } = require("@turf/turf");

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
  let groupNumber = Math.floor(datas.length / dataPoints);

  if (datas.length < dataPoints) {
    // Duplicate data
    while (datas.length <= dataPoints) {
      datas.push(datas[0]);
    }
    groupNumber = Math.floor(datas.length / dataPoints);
  }

  for (let i = 0; i < dataPoints; i++) {
    let group = datas.slice(i * groupNumber, (i + 1) * groupNumber);

    if (i === dataPoints - 1) {
      group = datas.slice(i * groupNumber);
    }
    let sum = 0;
    let count = 0;

    for (const message of group) {
      sum += message[`${dataType}`] ? message[`${dataType}`] : 0;

      if (message[`${dataType}`]) count++;
    }
    const avg = sum / count;
    data.push(avg);

    labels.push(new Date(group[0].timestamp));
  }

  return { data, labels };
};

// GET /api/devicePhase/:devicePhaseId/graph?type&range&points

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
  const points = req.query.point * 1 || 5;

  const current = { current: devicePhase[`${req.query.type}`] };
  let data = [];
  let label = [];
  let sign = "positive";
  let change = 0;

  if (req.query.range === "minute") {
    let timeRange = 60 * 1000;
    const message = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - timeRange),
            $lte: new Date(new Date()),
          },
        },
      },
    ]);

    if (message.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          isEnough: false,
          current: devicePhase[`${req.query.type}`] || 0,
        },
      });
      return;
    }

    let overallAvg = 0;
    let countValid = 0;

    for (let i = points; i > 0; i--) {
      const max = new Date(new Date() - ((i - 1) * timeRange) / points);
      const min = new Date(new Date() - (i * timeRange) / points);

      const filteredMessage = message.filter(
        (msg) => msg.createdAt >= min && msg.createdAt < max
      );

      label.push(new Date((max.getTime() + min.getTime()) / 2));
      if (filteredMessage.length === 0) {
        data.push(null);
      } else {
        countValid++;
        const avg = filteredMessage.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / filteredMessage.length;
        }, 0);
        overallAvg += avg;
        data.push(avg);
      }

      const currentAvg = overallAvg / countValid;

      const messageChange = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              req.params.devicePhaseId
            ),
            timestamp: {
              $lte: new Date(new Date() - timeRange),
              $gte: new Date(new Date() - timeRange * 2),
            },
          },
        },
      ]);

      if (messageChange.length === 0) {
        change = 100;
        sign = "positive";
      } else {
        const previousAvg = messageChange.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / messageChange.length;
        }, 0);

        change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (change < 0) {
          sign = "negative";
        }
      }
    }
  } else if (req.query.range === "hour") {
    let timeRange = 60 * 60 * 1000;
    const message = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - timeRange),
            $lte: new Date(new Date()),
          },
        },
      },
    ]);

    if (message.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          isEnough: false,
          current: devicePhase[`${req.query.type}`] || 0,
        },
      });
      return;
    }
    let overallAvg = 0;
    let countValid = 0;

    for (let i = points; i > 0; i--) {
      const max = new Date(new Date() - ((i - 1) * timeRange) / points);
      const min = new Date(new Date() - (i * timeRange) / points);
      const filteredMessage = message.filter(
        (msg) => msg.createdAt >= min && msg.createdAt < max
      );

      label.push(new Date((max.getTime() + min.getTime()) / 2));
      if (filteredMessage.length === 0) {
        data.push(null);
      } else {
        countValid++;
        const avg = filteredMessage.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / filteredMessage.length;
        }, 0);
        overallAvg += avg;
        data.push(avg);
      }

      const currentAvg = overallAvg / countValid;

      const messageChange = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              req.params.devicePhaseId
            ),
            timestamp: {
              $lte: new Date(new Date() - timeRange),
              $gte: new Date(new Date() - timeRange * 2),
            },
          },
        },
      ]);

      if (messageChange.length === 0) {
        change = 100;
        sign = "positive";
      } else {
        const previousAvg = messageChange.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / messageChange.length;
        }, 0);

        change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (change < 0) {
          sign = "negative";
        }
      }
    }
  } else if (req.query.range === "day") {
    let timeRange = 24 * 60 * 60 * 1000;
    const message = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - timeRange),
            $lte: new Date(new Date()),
          },
        },
      },
    ]);

    if (message.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          isEnough: false,
          current: devicePhase[`${req.query.type}`] || 0,
        },
      });
      return;
    }

    let overallAvg = 0;
    let countValid = 0;

    for (let i = points; i > 0; i--) {
      const max = new Date(new Date() - ((i - 1) * timeRange) / points);
      const min = new Date(new Date() - (i * timeRange) / points);
      const filteredMessage = message.filter(
        (msg) => msg.createdAt >= min && msg.createdAt < max
      );

      label.push(new Date((max.getTime() + min.getTime()) / 2));
      if (filteredMessage.length === 0) {
        data.push(null);
      } else {
        countValid++;
        const avg = filteredMessage.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / filteredMessage.length;
        }, 0);
        overallAvg += avg;
        data.push(avg);
      }

      const currentAvg = overallAvg / countValid;

      const messageChange = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              req.params.devicePhaseId
            ),
            timestamp: {
              $lte: new Date(new Date() - timeRange),
              $gte: new Date(new Date() - timeRange * 2),
            },
          },
        },
      ]);

      if (messageChange.length === 0) {
        change = 100;
        sign = "positive";
      } else {
        const previousAvg = messageChange.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / messageChange.length;
        }, 0);

        change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (change < 0) {
          sign = "negative";
        }
      }
    }
  } else if (req.query.range === "week") {
    let timeRange = 7 * 24 * 60 * 60 * 1000;
    const message = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - timeRange),
            $lte: new Date(new Date()),
          },
        },
      },
    ]);

    if (message.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          isEnough: false,
          current: devicePhase[`${req.query.type}`] || 0,
        },
      });
      return;
    }

    let overallAvg = 0;
    let countValid = 0;

    for (let i = points; i > 0; i--) {
      const max = new Date(new Date() - ((i - 1) * timeRange) / points);
      const min = new Date(new Date() - (i * timeRange) / points);
      const filteredMessage = message.filter(
        (msg) => msg.createdAt >= min && msg.createdAt < max
      );

      label.push(new Date((max.getTime() + min.getTime()) / 2));
      if (filteredMessage.length === 0) {
        data.push(null);
      } else {
        countValid++;
        const avg = filteredMessage.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / filteredMessage.length;
        }, 0);
        overallAvg += avg;
        data.push(avg);
      }

      const currentAvg = overallAvg / countValid;

      const messageChange = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              req.params.devicePhaseId
            ),
            timestamp: {
              $lte: new Date(new Date() - timeRange),
              $gte: new Date(new Date() - timeRange * 2),
            },
          },
        },
      ]);

      if (messageChange.length === 0) {
        change = 100;
        sign = "positive";
      } else {
        const previousAvg = messageChange.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / messageChange.length;
        }, 0);

        change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (change < 0) {
          sign = "negative";
        }
      }
    }
  } else if (req.query.range === "month") {
    let timeRange = 4 * 7 * 24 * 60 * 60 * 1000;
    const message = await Message.aggregate([
      {
        $match: {
          "metadata.devicePhaseId": new mongoose.Types.ObjectId(
            req.params.devicePhaseId
          ),
          timestamp: {
            $gte: new Date(new Date() - timeRange),
            $lte: new Date(new Date()),
          },
        },
      },
    ]);

    if (message.length === 0) {
      res.status(200).json({
        status: "success",
        data: {
          isEnough: false,
          current: devicePhase[`${req.query.type}`] || 0,
        },
      });
      return;
    }
    let overallAvg = 0;
    let countValid = 0;

    for (let i = points; i > 0; i--) {
      const max = new Date(new Date() - ((i - 1) * timeRange) / points);
      const min = new Date(new Date() - (i * timeRange) / points);
      const filteredMessage = message.filter(
        (msg) => msg.createdAt >= min && msg.createdAt < max
      );

      label.push(new Date((max.getTime() + min.getTime()) / 2));
      if (filteredMessage.length === 0) {
        data.push(null);
      } else {
        countValid++;
        const avg = filteredMessage.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / filteredMessage.length;
        }, 0);
        overallAvg += avg;
        data.push(avg);
      }

      const currentAvg = overallAvg / countValid;

      const messageChange = await Message.aggregate([
        {
          $match: {
            "metadata.devicePhaseId": new mongoose.Types.ObjectId(
              req.params.devicePhaseId
            ),
            timestamp: {
              $lte: new Date(new Date() - timeRange),
              $gte: new Date(new Date() - timeRange * 2),
            },
          },
        },
      ]);

      if (messageChange.length === 0) {
        change = 100;
        sign = "positive";
      } else {
        const previousAvg = messageChange.reduce((acc, cur) => {
          return acc + cur[`${req.query.type}`] / messageChange.length;
        }, 0);

        change = ((currentAvg - previousAvg) / previousAvg) * 100;
        if (change < 0) {
          sign = "negative";
        }
      }
    }
  } else {
    return next(new AppError("Invalid range", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      isEnough: true,
      y: data.reverse(),
      x: label.reverse(),
      ...current,
      sign,
      change,
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

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to access this project.",
    "can_view",
    "can_edit",
    "owner"
  );

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

// GET /api/phase/:phaseId/visualization/battery
exports.getBatteryVisualization = catchAsync(async (req, res, next) => {
  const threshold = req.query.threshold || 20;
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Invalid phaseId", 400));

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to access this project.",
    "can_view",
    "can_edit",
    "owner"
  );

  // Get device phase has battery lower than threshold

  const devicePhase = await DevicePhase.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
        battery: { $lte: parseInt(threshold) },
      },
    },
    {
      $project: {
        id: "$_id",
        battery: 1,
        alias: 1,
        _id: 0,
      },
    },
    {
      $sort: {
        battery: 1,
      },
    },
  ]);

  res.status(200).json({
    stauts: "success",
    data: devicePhase,
  });
});

// GET /api/phase/:phaseId/visualization/lastConnection
exports.getLastConnectionVisualization = catchAsync(async (req, res, next) => {
  if (!isValidObjectId(req.params.phaseId))
    return next(new AppError("Invalid phaseId", 400));

  const testPhase = await Phase.findById(req.params.phaseId);
  if (!testPhase) return next(new AppError("Invalid phaseId", 400));

  checkCollab(
    next,
    testPhase.projectId,
    req.user.id,
    "You do not have permission to access this project.",
    "can_view",
    "can_edit",
    "owner"
  );

  if (!req.query.range || !req.query.threshold)
    return next(new AppError("Invalid query", 400));

  const range = req.query.range;
  const threshold = req.query.threshold;

  let mutiplierRange = 1;

  if (range === "second") {
    mutiplierRange = 1000;
  } else if (range === "minute") {
    mutiplierRange = 60 * 1000;
  } else if (range === "hour") {
    mutiplierRange = 60 * 60 * 1000;
  } else if (range === "day") {
    mutiplierRange = 24 * 60 * 60 * 1000;
  } else if (range === "month") {
    mutiplierRange = 30 * 24 * 60 * 60 * 1000;
  } else {
    return next(new AppError("Invalid range", 400));
  }

  const devicePhase = await DevicePhase.aggregate([
    {
      $match: {
        phaseId: new mongoose.Types.ObjectId(req.params.phaseId),
        lastConnection: {
          $gte: new Date(new Date() - threshold * mutiplierRange),
        },
      },
    },
    {
      $project: {
        id: "$_id",
        lastConnection: 1,
        alias: 1,
        _id: 0,
      },
    },
    {
      $sort: {
        lastConnection: -1,
      },
    },
  ]);
  res.status(200).json({
    stauts: "success",
    data: devicePhase,
  });
});
