const mongoose = require("mongoose");

const deviceFirmwareSchema = new mongoose.Schema({
  devicePhaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "DevicePhase",
    required: [true, "DeviceFirmware must has a devicePhaseId"],
  },
  firmwareVersionId: {
    type: mongoose.Schema.ObjectId,
    ref: "FirmwareVersion",
    required: [true, "DeviceFirmware must has a firmwareVersionId"],
  },
  startedAt: Date,
  endedAt: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  autoUpdate: {
    type: Boolean,
    default: false,
  },
});

const DeviceFirmware = mongoose.model("DeviceFirmware", deviceFirmwareSchema);
module.exports = DeviceFirmware;
