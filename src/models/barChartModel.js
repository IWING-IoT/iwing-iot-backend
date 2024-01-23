const mongoose = require("mongoose");

const barChartSchema = new mongoose.Schema({
  visualizationId: {
    type: mongoose.Schema.ObjectId,
    ref: "Visualization",
    required: [true, "Bar Chart must has a visualizationId"],
  },
  categoricalDataId: {
    type: mongoose.Schema.ObjectId,
    ref: "PhaseApi",
    required: [true, "Bar Chart must has a categoricalDataId"],
  },
  devicePhaseIds: {
    type: [mongoose.Schema.ObjectId],
    ref: "DevicePhase",
    default: [],
  },
  aggregationFunction: {
    type: String,
    enum: ["count", "sum", "avg", "min", "max"],
    default: "count",
  },
  xAxisName: {
    type: String,
    required: [true, "Bar Chart must has a xAxisName"],
  },
  yAxisName: {
    type: String,
    required: [true, "Bar Chart must has a yAxisName"],
  },
  max: Number,
  min: Number,
});

const BarChart = mongoose.model("BarChart", barChartSchema);

module.exports = BarChart;
