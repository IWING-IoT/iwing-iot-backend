const mongoose = require("mongoose");

const deviceTypeSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "DeviceType must has a name"],
  },
  description: String,
});

const DeviceType = mongoose.model("DeviceType", deviceTypeSchema);

module.exports = DeviceType;
