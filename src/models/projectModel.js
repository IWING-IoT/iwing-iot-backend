const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A project must has a name"],
    maxlength: 100,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "A project must has a owner Id"],
  },
  location: {
    type: String,
    required: [true, "A project must has a location"],
  },
  template: {
    type: mongoose.Schema.ObjectId,
    required: [true, "A project must has a template"],
  },
  startedAt: {
    type: Date,
    required: [true, "A project must has a started date"],
  },
  description: String,
  endedAt: Date,
  createdAt: Date,
  isArchived: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
