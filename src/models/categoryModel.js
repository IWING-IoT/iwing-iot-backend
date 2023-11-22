const mongoose = require("mongoose");

categorySchema = new mongoose.Schema({
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
  mainAttributeName: {
    type: String,
    required: [true, "Category must has a main attribute name"],
    maxlength: 50,
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
});

const Category = mongoose.model("Category", categorySchemas);

module.exports = Category;
