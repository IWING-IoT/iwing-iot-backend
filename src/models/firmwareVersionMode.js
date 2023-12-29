const mongoose = require("mongoose");

const firmwareVersionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "FirmwareVersion must has a name"],
  },
  firmwareId: {
    type: mongoose.Schema.ObjectId,
    ref: "Firmware",
    required: [true, "FirmwareVersion must has a firmwareId"],
  },
  description: String,
  gitUrl: String,
  filename: {
    type: String,
    required: [true, "FirmwareVersion must has a filename"],
  },
  fileExtension: {
    type: String,
    required: [true, "FirmwareVersion must has a fileExtension"],
  },
  markdown: String,
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdAt: Date,
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const FirmwareVersion = mongoose.model(
  "FirmwareVersion",
  firmwareVersionSchema
);

module.exports = FirmwareVersion;
