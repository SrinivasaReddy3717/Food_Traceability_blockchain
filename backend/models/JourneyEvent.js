const mongoose = require('mongoose');

const journeyEventSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            index: true
        },

        eventType: {
            type: String,
            required: true,
            enum: [
                'Production',
                'Processing',
                'Transportation',
                'Distribution',
                'Consumer Verification'
            ]
        },

        location: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        performedBy: {
            type: String,
            required: true
        },

        eventDate: {
            type: Date,
            default: Date.now
        },

        blockchainHash: {
            type: String,
            default: null
        },

        transactionHash: {
            type: String,
            default: null
        },

        blockNumber: {
            type: Number,
            default: null
        },

        contractAddress: {
            type: String,
            default: null
        },

        blockchainStatus: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Failed'],
            default: 'Pending'
        },

        blockchainError: {
            type: String,
            default: null
        },

        blockchainRecordedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('JourneyEvent', journeyEventSchema);
