const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const shopSchema = new mongoose.Schema({
  name: { type: String },
  ownername: { type: String },
  email: { type: String },
  password: { type: String },
  description: { type: String, },
  address: { type: String },
  phoneNumber: { type: String, },
  role: { type: String, default: "Seller" },
  avatar: { type: String },
  zipCode: { type: Number },
  withdrawMethod: { type: Object },
  availableBalance: { type: Number, default: 0, },
  transections: [
    {
      amount: {
        type: Number,
      },
      status: {
        type: String,
        default: "Processing",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      updatedAt: {
        type: Date,
      },
    },
  ],
}, { timestamps: true });

// // Hash password
shopSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// comapre password
shopSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Shop", shopSchema);
