const mongoose = require("mongoose");

const typeEnum = ["string", "image", "category_reference"];
const attributeSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: [true, "Attribute must has a categoryId"],
  },
  name: {
    type: String,
    required: [true, "Attribute must has a name"],
  },
  type: {
    type: String,
    required: [true, "Attribute must has a type"],
    enum: typeEnum,
  },
  position: {
    type: Number,
    required: [true, "Attribute must has position in table"],
  },
  parentCategoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
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

const Attribute = mongoose.model("Attribute", attributeSchema);

module.exports = Attribute;
