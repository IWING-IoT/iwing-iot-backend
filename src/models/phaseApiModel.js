const mongoose = require("mongoose");

const dataTypeEnum = ["String", "Number", "Boolean", "Date"];

const phaseApiSchema = new mongoose.Schema({
  phaseId: {
    type: mongoose.Schema.ObjectId,
    ref: "Phase",
    required: [true, "Phase API required phaseId"],
  },
  name: {
    type: String,
    required: [true, "Phase API required name"],
  },
  dataType: {
    type: String,
    required: [true, "Phase API required datatype"],
    enum: dataTypeEnum,
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
  },
});

const PhaseApi = mongoose.model("PhaseApi", phaseApiSchema);

module.exports = PhaseApi;
