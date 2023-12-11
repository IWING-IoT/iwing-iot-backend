const mongoose = require("mongoose");

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
  categoryDataId: {
    type: [mongoose.Schema.ObjectId],
    ref: "CategoryData",
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
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
});

const DevicePhase = mongoose.Schema("DevicePhase", devicePhaseSchema);

module.exports = DevicePhase;
