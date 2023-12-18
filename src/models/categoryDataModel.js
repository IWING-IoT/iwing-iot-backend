const mongoose = require("mongoose");

const categoryDataSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Category data required categoryId"],
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
  },
  { strict: false }
);

const CategoryData = mongoose.model("CategoryData", categoryDataSchema);

module.exports = CategoryData;
