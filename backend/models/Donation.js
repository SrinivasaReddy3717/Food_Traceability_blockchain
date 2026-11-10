const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donationId: {
      type: String,
      unique: true,
      required: true,
    },

    donorId: {
      type: String,
      required: true,
      trim: true,
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ],
    },

    donationDate: {
      type: Date,
      default: Date.now,
    },

    bloodUnitId: {
      type: String,
      required: true,
      unique: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    testStatus: {
      type: String,
      enum: ["Pending", "Passed", "Failed"],
      default: "Pending",
    },

    donationStatus: {
      type: String,
      enum: ["Registered", "Collected", "Tested", "Completed", "Rejected"],
      default: "Registered",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Donation", donationSchema);