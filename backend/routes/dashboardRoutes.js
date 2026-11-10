const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
const JourneyEvent = require('../models/JourneyEvent');
const { optionalProtect } = require('../middleware/authMiddleware');
const { isStaffUser, getReadyProductIds } = require('../utils/stageCheck');

// Real MongoDB summary statistics for Dashboard (scoped for consumers to 4-stage-completed products)
router.get('/stats', optionalProtect, async (req, res) => {
    try {
        const staffView = isStaffUser(req.user);
        let productScope = {};
        let eventScope = {};

        if (!staffView) {
            const readyIds = await getReadyProductIds();
            productScope = { productId: { $in: readyIds } };
            eventScope = { productId: { $in: readyIds } };
        }

        const [
            totalProducts,
            totalEvents,
            distinctProducers,
            verifiedRecords,
            pendingRecords,
            inTransitProducts,
            distributedProducts,
            recentProducts,
            recentEventsRaw
        ] = await Promise.all([
            Product.countDocuments(productScope),
            JourneyEvent.countDocuments(eventScope),
            Product.distinct('producer', productScope),
            JourneyEvent.countDocuments({
                ...eventScope,
                blockchainStatus: 'Confirmed',
                blockchainHash: { $ne: null },
                transactionHash: { $ne: null }
            }),
            JourneyEvent.countDocuments({
                ...eventScope,
                $or: [
                    { blockchainStatus: { $ne: 'Confirmed' } },
                    { blockchainHash: null },
                    { transactionHash: null }
                ]
            }),
            Product.countDocuments({ ...productScope, status: 'In Transit' }),
            Product.countDocuments({ ...productScope, status: 'Distributed' }),
            Product.find(productScope).sort({ createdAt: -1 }).limit(5),
            JourneyEvent.find(eventScope).sort({ createdAt: -1 }).limit(6)
        ]);

        // Map productId -> productName for recent events
        const productIds = [...new Set(recentEventsRaw.map((e) => e.productId))];
        const relatedProducts = await Product.find({
            productId: { $in: productIds }
        }).select('productId productName');

        const productNameMap = {};
        for (const p of relatedProducts) {
            productNameMap[p.productId] = p.productName;
        }

        const recentEvents = recentEventsRaw.map((event) => ({
            id: event._id,
            productId: event.productId,
            productName: productNameMap[event.productId] || event.productId,
            eventType: event.eventType,
            location: event.location,
            performedBy: event.performedBy,
            eventDate: event.eventDate,
            blockchainStatus:
                event.blockchainHash && event.transactionHash
                    ? event.blockchainStatus || 'Confirmed'
                    : 'Pending',
            blockchainHash: event.blockchainHash,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber
        }));

        res.status(200).json({
            success: true,
            stats: {
                totalProducts,
                totalEvents,
                totalProducers: distinctProducers.length,
                verifiedRecords,
                pendingRecords,
                inTransitProducts,
                distributedProducts
            },
            recentProducts,
            recentEvents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
