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
  lastConnection: {
    type: Date,
  },
});

const Gateway = mongoose.Schema("Gateway", gatewaySchema);

module.exports = Gateway;
