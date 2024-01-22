const mongoose = require("mongoose");

const markSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Mark must has a name"],
  },
  description: {
    type: String,
  },
  latitude: {
    type: Number,
    required: [true, "Mark must has a latitude"],
  },
  longitude: {
    type: Number,
    required: [true, "Mark must has a longitude"],
  },
  phaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Phase",
    required: [true, "Mark must has a phaseId"],
  },
  devicePhaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "DevicePhase",
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Mark must has a creatorID"],
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const Mark = mongoose.model("Mark", markSchema);

module.exports = Mark;
