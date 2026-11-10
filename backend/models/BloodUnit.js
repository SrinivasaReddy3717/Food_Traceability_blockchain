const mongoose = require("mongoose");

const bloodUnitSchema = new mongoose.Schema(
  {
    bloodUnitId: {
      type: String,
      unique: true,
      required: true,
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

    donationId: {
      type: String,
      required: true,
    },

    collectionDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "REGISTERED",
        "AVAILABLE",
        "RESERVED",
        "APPROVED",
        "IN_TRANSIT",
        "DELIVERED",
        "EXPIRED",
        "DISCARDED",
      ],
      default: "REGISTERED",
    },

    ipfsCid: {
      type: String,
      default: null,
    },

    blockchainTxHash: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BloodUnit", bloodUnitSchema);