const mongoose = require("mongoose");

const deviceFirmwareSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.ObjectId,
    ref: "Device",
    required: [true, "DeviceFirmware must has a deviceId"],
  },
  firmwareVersionId: {
    type: mongoose.Schema.ObjectId,
    ref: "FirmwareVersion",
    required: [true, "DeviceFirmware must has a firmwareVersionId"],
  },
  stratedAt: Date,
  endedAt: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
});

const DeviceFirmware = mongoose.model("DeviceFirmware", deviceFirmwareSchema);
module.exports = DeviceFirmware;
