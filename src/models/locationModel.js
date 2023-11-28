const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  en_name: String,
  th_name: String,
});

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;
