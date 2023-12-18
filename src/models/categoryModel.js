const mongoose = require("mongoose");

const typeEnum = ["string", "image", "category_reference"];

const attributeDataSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Attribute data require name"],
  },
  type: {
    type: String,
    required: [true, "Attribute data require type"],
    enum: typeEnum,
  },
  parentCategoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },
});

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
    type: String,
  },
  description: {
    type: String,
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  otherAttributes: {
    type: [attributeDataSchema],
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
