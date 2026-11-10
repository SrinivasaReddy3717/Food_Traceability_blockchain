const mongoose = require("mongoose");

const blockchainTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },

    requestId: {
      type: String,
      default: null,
    },

    bloodUnitId: {
      type: String,
      default: null,
    },

    fromAddress: {
      type: String,
      required: true,
      trim: true,
    },

    toAddress: {
      type: String,
      required: true,
      trim: true,
    },

    transactionHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    action: {
      type: String,
      enum: [
        "REGISTER",
        "DONATE",
        "CREATE_BLOOD_UNIT",
        "REQUEST",
        "APPROVE",
        "RESERVE",
        "TRANSFER",
        "DELIVER",
        "UPDATE_STATUS",
      ],
      required: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "BlockchainTransaction",
  blockchainTransactionSchema
);