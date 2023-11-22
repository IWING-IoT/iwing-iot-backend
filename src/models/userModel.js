const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "User must have a name"],
    maxlength: [30, "Maximum of user name is 30"],
  },
  email: {
    type: String,
    required: [true, "User must have a email"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "User must have a password"],
    minlength: 8,
    select: false,
  },
  roleId: {
    type: mongoose.Schema.ObjectId,
    ref: "Role",
    required: [true, "User must have role"],
  },
  // role: String,
  userStatus: {
    type: String,
    enum: ["notConfirm", "active"],
    default: "active",
  },
  createdAt: Date,
  editedAt: Date,
  passwordChangedAt: Date,
});

// Hashing password before save into database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next;
  this.password = await bcrypt.hashSync(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async (testPassword, userPassword) => {
  return await bcrypt.compare(testPassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
