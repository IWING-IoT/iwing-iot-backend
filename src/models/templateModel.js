const mongoose = require("mongoose");

const typeEnum = ["String", "Number"];

const templateAttributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Template Attribute must has a name"],
  },
  type: {
    type: String,
    required: [true, "Template Attribute must has a data type"],
    enum: typeEnum,
  },
});

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Project Template must has a name"],
    unique: true,
  },
  description: String,
  attributes: {
    type: [templateAttributeSchema],
    required: [true, "Project Template must has attriubute list"],
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
  isPublic: {
    type: Boolean,
    default: false,
  },
});

const TemplateAttribute = mongoose.model(
  "TemplateAttribute",
  templateAttributeSchema
);

const Template = mongoose.model("Template", templateSchema);

module.exports = Template;
