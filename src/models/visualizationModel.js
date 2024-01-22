const mongoose = require("mongoose");

const visualizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Visualization must has a name"],
  },
  description: {
    type: String,
  },
  phaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Phase",
    required: [true, "Visualization must has a phaseId"],
  },
  position: {
    type: Number,
    required: [true, "Visualization must has a position"],
  },
  template: {
    type: String,
    enum: ["default", "LineChart", "BarChart"],
    required: [true, "Visualization must has a template"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Visualization must has a createdBy"],
  },
  editedAt: {
    type: Date,
  },
  editedAt: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const Visualization = mongoose.model("Visualization", visualizationSchema);

module.exports = Visualization;
