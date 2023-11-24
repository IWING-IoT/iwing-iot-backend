const mongoose = require("mongoose");

const typeEnum = [
  "String",
  "Image file",
  "Integer or decimal",
  "Category reference",
];

attributeSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: [true, "Attriubute must has a categoryID"],
  },
  name: {
    type: String,
    required: [true, "Attribute must has a name"],
    maxlength: 50,
  },
  type: {
    type: String,
    required: [true, "Attribute must has a data type"],
    enum: typeEnum,
  },
  parentCategoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    default: null,
  },
  positionInCategory: {
    type: Number,
    required: [true, "Attribute must has a position in category"],
  },
  createdAt: Date,
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "Attribute must has a creator ID"],
  },
  editedAt: Date,
  editedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const Attribute = mongoose.model("Attribute", attributeSchema);

module.exports = Attribute;
