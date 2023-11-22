const mongoose = require("mongoose");

const phaseSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
    required: [true, "Phase must has projectID"],
  },
  name: {
    type: String,
    required: [true, "Phase must has a name"],
    maxlength: 50,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startedAt: {
    type: Date,
    required: [true, "Phase must has a start date"],
  },
  endedAt: Date,
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
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
});

const Phase = mongoose.model("Phase", phaseSchema);

module.exports = Phase;
