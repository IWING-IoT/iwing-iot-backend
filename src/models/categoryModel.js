const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
    required: [true, "Category must has a project"],
  },
  name: {
    type: String,
    required: [true, "Category must has a names"],
    maxlength: 50,
  },
  mainAttribute: {
    type: mongoose.Schema.ObjectId,
    ref: "Attribute",
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
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
