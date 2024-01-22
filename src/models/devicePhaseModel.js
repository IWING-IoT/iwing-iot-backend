const mongoose = require("mongoose");

const devicePhaseStatusEnum = ["active", "inactive", "archived"];
const devicePhaseSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.ObjectId,
    ref: "Device",
    required: [true, "DevicePhase must has a deviceId"],
  },
  phaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Phase",
    required: [true, "Device phase must has a phaseId"],
  },
  alias: {
    type: String,
  },
  status: {
    type: String,
    required: [true, "DevicePhase must has a status"],
    enum: devicePhaseStatusEnum,
  },
  categoryDataId: {
    type: [mongoose.Schema.ObjectId],
    ref: "CategoryEntity",
    default: [],
  },
  messageReceive: {
    type: Number,
    default: 0,
  },
  lastConnection: {
    type: Date,
  },
  temperature: {
    type: Number,
  },
  delay: {
    type: Number,
  },
  battery: {
    type: Number,
  },
  jwt: {
    type: String,
  },
  isOutside: {
    type: Boolean,
    default: false,
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Collaborator must has a creatorID"],
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const DevicePhase = mongoose.model("DevicePhase", devicePhaseSchema);

module.exports = DevicePhase;
