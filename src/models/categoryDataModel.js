const mongoose = require("mongoose");

const attributeDataSchema = new mongoose.Schema({
  attributeId: {
    type: mongoose.Schema.ObjectId,
    ref: "Attribute",
    required: [true, "Attribute data require attributeId"],
  },
  data: {
    type: String,
    required: [true, "Attribute data require data"],
  },
});

const categoryDataSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: [true, "Category data required categoryId"],
  },
  data: {
    type: [attributeDataSchema],
    required: [true, "Category data required attribute data"],
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

const CategoryData = mongoose.model("CategoryData", categoryDataSchema);
const AttributeData = mongoose.model("AttributeData", attributeDataSchema);

module.exports = CategoryData;
