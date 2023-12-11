const mongoose = require("mongoose");

const statusEnum = ["available", "unavailable", "inuse"];

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Device must has a name"],
  },
  type: {
    type: mongoose.Schema.ObjectId,
    ref: "DeviceType",
    required: [true, "Device must has device type"],
  },
  status: {
    type: String,
    enum: statusEnum,
    default: "available",
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

const Device = mongoose.model("Device", deviceSchema);

module.exports = Device;
