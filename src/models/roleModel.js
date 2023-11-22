const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Role must have a name"],
    unique: true,
  },
  description: {
    type: String,
  },
});

const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
