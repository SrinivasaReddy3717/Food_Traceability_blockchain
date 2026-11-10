const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      unique: true,
      required: true,
    },

    walletAddress: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    hospitalName: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    contact: {
      type: String,
      required: true,
      trim: true,
    },

    registrationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Hospital", hospitalSchema);