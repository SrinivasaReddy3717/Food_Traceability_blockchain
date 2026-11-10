const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
    {
        productId: {
            type: String,
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        consumerName: {
            type: String,
            required: true,
            trim: true
        },

        consumerEmail: {
            type: String,
            default: '',
            trim: true
        },

        feedbackType: {
            type: String,
            enum: ['Quality Feedback', 'Incorrect Information Report'],
            default: 'Quality Feedback'
        },

        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },

        comment: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Feedback', feedbackSchema);

