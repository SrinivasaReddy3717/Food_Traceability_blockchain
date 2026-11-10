const mongoose = require("mongoose");

const donorSchema = new mongoose.Schema(
  {
    donorId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    // Optional: donors do not need individual blockchain wallets.
    walletAddress: {
      type: String,
      default: undefined,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    age: {
      type: Number,
      required: true,
      min: 18,
    },

    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },

    bloodGroup: {
      type: String,
      required: true,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
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

// Only donors who actually have a wallet address need a unique wallet.
donorSchema.index(
  { walletAddress: 1 },
  {
    unique: true,
    partialFilterExpression: {
      walletAddress: { $type: "string" },
    },
  }
);

module.exports = mongoose.model("Donor", donorSchema);