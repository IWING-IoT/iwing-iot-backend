const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Permission must has name"],
    unique: true,
  },
  description: {
    type: String,
    maxlength: 4000,
  },
});

const Permission = mongoose.model("Permission", permissionSchema);

module.exports = Permission;
