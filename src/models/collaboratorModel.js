const mongoose = require("mongoose");

const collaboratorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Collaborator must has a userID"],
  },
  permissionId: {
    type: mongoose.Schema.ObjectId,
    ref: "Permission",
    required: [true, "Collaborator must has a permission"],
  },
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
    required: [true, "Collaborator must has a project"],
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
});

const Collaborator = mongoose.model("Collaborator", collaboratorSchema);

module.exports = Collaborator;
