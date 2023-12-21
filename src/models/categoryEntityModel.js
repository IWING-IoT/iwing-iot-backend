const mongoose = require("mongoose");

const categoryEntitySchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
    required: [true, "Category Entity must has a categoryId"],
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

const CategoryEntity = mongoose.Schema("CategoryEntity", categoryEntitySchema);

module.exports = CategoryEntity;
