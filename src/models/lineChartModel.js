const mongoose = require("mongoose");

const lineChartSchema = new mongoose.Schema({
  visualizationId: {
    type: mongoose.Schema.ObjectId,
    ref: "Visualization",
    required: [true, "Line Chart must has a visualizationId"],
  },
  numercialDataId: {
    type: mongoose.Schema.ObjectId,
    ref: "PhaseApi",
    required: [true, "Line Chart must has a numercialDataId"],
  },
  devicePhaseIds: {
    type: [mongoose.Schema.ObjectId],
    ref: "DevicePhase",
    default: [],
  },
  type: {
    type: String,
    enum: ["timeseries", "avg"],
    default: "timeseries",
  },
  xAxisName: {
    type: String,
    required: [true, "Line Chart must has a xAxisName"],
  },
  yAxisName: {
    type: String,
    required: [true, "Line Chart must has a yAxisName"],
  },
  max: Number,
  min: Number,
  timeRange: {
    type: String,
    enum: ["second", "minute", "hour", "day", "week", "month", "year"],
    required: [true, "Line Chart must has a timeRange"],
  },
});

const LineChart = mongoose.model("LineChart", lineChartSchema);

module.exports = LineChart;
