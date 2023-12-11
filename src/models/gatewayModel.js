const mongoose = require("mongoose");

const gatewaySchema = new mongoose.Schema({
  gatewayId: {
    type: mongoose.Schema.ObjectId,
    ref: "DevicePhase",
    required: [true, "Gateway must has a gatewayId"],
  },
  nodeId: {
    type: mongoose.Schema.ObjectId,
    ref: "DevicePhase",
    required: [true, "Gateway must has a nodeId"],
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

const Gateway = mongoose.Schema("Gateway", gatewaySchema);

module.exports = Gateway;
