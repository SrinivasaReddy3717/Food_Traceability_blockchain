const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true
    },

    productName: {
      type: String,
      required: true
    },

    category: {
      type: String,
      required: true
    },

    producer: {
      type: String,
      required: true
    },

    origin: {
      type: String,
      required: true
    },

    quantity: {
      type: Number,
      required: true
    },

    productionDate: {
      type: Date,
      required: true
    },

    batchNumber: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: [
        'Registered',
        'Production',
        'Processing',
        'In Transit',
        'Distributed',
        'Verified'
      ],
      default: 'Registered'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
