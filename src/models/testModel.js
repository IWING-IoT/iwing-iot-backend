const mongoose = require("mongoose");

const testSchema = new mongoose.Schema(
  {
    // name: {
    //   type: String,
    //   required: true,
    // },
    arrayTest: {
      type: [String],
    },
    imgTest: {
      type: String,
    },
  },
  {
    strict: false,
  }
);

const Test = mongoose.model("Test", testSchema);

module.exports = Test;
