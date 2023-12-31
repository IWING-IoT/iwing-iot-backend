const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    createdAt: Date,
    temperature: Number,
    lattitude: Number,
    longtitude: Number,
    battery: Number,
    metadata: {
      devicePhaseId: {
        type: mongoose.Schema.ObjectId,
        ref: "DevicePhase",
      },
    },
  },
  {
    timeseries: {
      timeField: "createdAt",
      metaField: "metadata",
    },
    strict: false,
  }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
