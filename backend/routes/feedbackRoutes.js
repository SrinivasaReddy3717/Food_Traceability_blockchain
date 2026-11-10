const express = require('express');
const router = express.Router();

const Feedback = require('../models/Feedback');
const Product = require('../models/Product');
const { optionalProtect } = require('../middleware/authMiddleware');

// Submit consumer feedback or incorrect-information report for a product
router.post('/', optionalProtect, async (req, res) => {
    try {
        if (req.user && req.user.role !== 'Consumer') {
            return res.status(403).json({
                success: false,
                message: 'Only consumers can submit product feedback'
            });
        }

        const {
            productId,
            consumerName,
            consumerEmail,
            feedbackType,
            rating,
            comment
        } = req.body || {};

        const numericRating = Number(rating);

        if (
            !productId ||
            !comment ||
            !comment.trim() ||
            Number.isNaN(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide productId, a rating (1 to 5), and feedback comments'
            });
        }

        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const allowedTypes = ['Quality Feedback', 'Incorrect Information Report'];
        const chosenType = allowedTypes.includes(feedbackType)
            ? feedbackType
            : 'Quality Feedback';

        const savedFeedback = await Feedback.create({
            productId,
            userId: req.user ? req.user._id : null,
            consumerName:
                (req.user && req.user.name) ||
                (consumerName && consumerName.trim()) ||
                'Consumer',
            consumerEmail:
                (req.user && req.user.email) ||
                (consumerEmail && consumerEmail.trim()) ||
                '',
            feedbackType: chosenType,
            rating: numericRating,
            comment: comment.trim()
        });

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: savedFeedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get recent feedback across all products (for dashboard)
router.get('/', async (req, res) => {
    try {
        const feedback = await Feedback.find().sort({ createdAt: -1 }).limit(10);
        res.status(200).json({
            success: true,
            count: feedback.length,
            feedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get feedback for a specific product
router.get('/:productId', async (req, res) => {
    try {
        const feedback = await Feedback.find({
            productId: req.params.productId
        }).sort({ createdAt: -1 });

        const averageRating =
            feedback.length > 0
                ? Number(
                      (
                          feedback.reduce((sum, item) => sum + item.rating, 0) /
                          feedback.length
                      ).toFixed(1)
                  )
                : 0;

        res.status(200).json({
            success: true,
            count: feedback.length,
            averageRating,
            feedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;

