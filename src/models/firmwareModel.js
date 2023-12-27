const mongoose = require("mongoose");

const firmwareTypeEnum = ["binary", "config", "source"];

const firmwareSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Firmware must has a name"],
  },
  type: {
    type: String,
    required: [true, "Firmware must has a type"],
    enum: firmwareTypeEnum,
  },
  description: String,
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  deletedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const Firmware = mongoose.model("Firmware", firmwareSchema);

module.exports = Firmware;
