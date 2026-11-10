const mongoose = require("mongoose");

const bloodRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: true,
    },

    hospitalId: {
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

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    requestDate: {
      type: Date,
      default: Date.now,
    },

    priority: {
      type: String,
      enum: ["Normal", "Urgent", "Emergency"],
      default: "Normal",
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "RESERVED",
        "IN_TRANSIT",
        "DELIVERED",
        "COMPLETED",
      ],
      default: "PENDING",
    },

    bloodUnitIds: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BloodRequest", bloodRequestSchema);