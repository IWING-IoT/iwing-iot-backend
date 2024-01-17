const mongoose = require("mongoose");

const areaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Area must has a name"],
  },
  description: {
    type: String,
    max: 2000,
  },
  phaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Phase",
    required: [true, "Area must has a phaseId"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  coordinates: {
    type: [Number],
    required: [true, "Area must has coordinates"],
  },
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
  alert: {
    type: Number,
    default: 0,
  },
});

const Area = mongoose.model("Area", areaSchema);
module.exports = Area;
