const mongoose = require("mongoose");

const attributeValueSchema = new mongoose.Schema({
  categoryEntityId: {
    type: mongoose.Schema.ObjectId,
    ref: "CategoryEntity",
    required: [true, "Attribute Value must has a categoryEntityId"],
  },
  attributeId: {
    type: mongoose.Schema.ObjectId,
    ref: "Attribute",
    required: [true, "Attribute Value must has a attributeId"],
  },
  value: {
    type: String,
    required: [true, "Attribute value must has a "],
  },
});

const AttributeValue = mongoose.model("AttributeValue", attributeValueSchema);

module.exports = AttributeValue;
