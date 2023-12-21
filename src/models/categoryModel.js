const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.ObjectId,
    ref: "Project",
    required: [true, "Category must has a projectId"],
  },
  name: {
    type: String,
    required: [true, "Category must has a name"],
  },
  description: {
    type: String,
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
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
