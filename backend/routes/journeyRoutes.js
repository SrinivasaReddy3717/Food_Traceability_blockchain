const express = require('express');
const router = express.Router();

const JourneyEvent = require('../models/JourneyEvent');
const Product = require('../models/Product');
const {
    protect,
    optionalProtect,
    authorizeRoles
} = require('../middleware/authMiddleware');
const {
    getBlockchainStatus,
    recordEventOnBlockchain,
    verifyEventOnBlockchain
} = require('../utils/blockchain');
const {
    isStaffUser,
    getMissingStagesForProduct
} = require('../utils/stageCheck');

const ROLE_ALLOWED_EVENTS = {
    Admin: [
        'Production',
        'Processing',
        'Transportation',
        'Distribution',
        'Consumer Verification'
    ],
    Farmer: ['Production'],
    Producer: ['Production'],
    Processor: ['Processing'],
    Transporter: ['Transportation'],
    Distributor: ['Distribution']
};

// Record a journey event (stores full details in MongoDB & SHA-256 hash on blockchain)
router.post(
    '/add',
    protect,
    authorizeRoles('Admin', 'Farmer', 'Producer', 'Processor', 'Transporter', 'Distributor'),
    async (req, res) => {
        try {
            const {
                productId,
                eventType,
                location,
                description,
                performedBy,
                eventDate
            } = req.body;

            if (
                !productId ||
                !eventType ||
                !location ||
                !description ||
                !performedBy
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide all required event details'
                });
            }

            const allowedForUser = ROLE_ALLOWED_EVENTS[req.user.role] || [];
            if (!allowedForUser.includes(eventType)) {
                return res.status(403).json({
                    success: false,
                    message: `Role "${req.user.role}" can only record: ${allowedForUser.join(', ') || 'none'}`
                });
            }

            const product = await Product.findOne({ productId });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const event = await JourneyEvent.create({
                productId,
                eventType,
                location,
                description,
                performedBy,
                eventDate: eventDate || new Date(),
                blockchainStatus: 'Pending'
            });

            let blockchainRecorded = false;
            let blockchainMessage = 'Journey event saved in MongoDB. Blockchain recording pending.';

            try {
                const chainResult = await recordEventOnBlockchain(event);
                event.blockchainHash = chainResult.blockchainHash;
                event.transactionHash = chainResult.transactionHash;
                event.blockNumber = chainResult.blockNumber;
                event.contractAddress = chainResult.contractAddress;
                event.blockchainStatus = 'Confirmed';
                event.blockchainError = null;
                event.blockchainRecordedAt = chainResult.blockchainRecordedAt;
                await event.save();

                blockchainRecorded = true;
                blockchainMessage = 'Journey event recorded in MongoDB and anchored on Ethereum blockchain.';
            } catch (chainError) {
                event.blockchainStatus = 'Pending';
                event.blockchainError = chainError.message;
                await event.save();
                console.warn('Blockchain recording deferred (Pending):', chainError.message);
            }

            // Update the product's current status
            product.status = eventType === 'Production'
                ? 'Production'
                : eventType === 'Processing'
                ? 'Processing'
                : eventType === 'Transportation'
                ? 'In Transit'
                : eventType === 'Distribution'
                ? 'Distributed'
                : 'Verified';

            await product.save();

            res.status(201).json({
                success: true,
                message: blockchainMessage,
                blockchainRecorded,
                event
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
);

// Record a Consumer Verification event when a consumer scans & verifies a product
router.post('/consumer-verify', optionalProtect, async (req, res) => {
    try {
        if (req.user && req.user.role !== 'Consumer') {
            return res.status(403).json({
                success: false,
                message: 'Only consumers or QR scanners can record a Consumer Verification event'
            });
        }

        const { productId, consumerName, location } = req.body || {};

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        const product = await Product.findOne({ productId });
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const missingStages = await getMissingStagesForProduct(productId);
        if (missingStages.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Consumer verification can only be done after completing Production, Processing, Transportation, and Distribution. Missing stages: ${missingStages.join(', ')}.`
            });
        }

        const priorEvents = await JourneyEvent.find({
            productId,
            eventType: { $ne: 'Consumer Verification' }
        }).sort({ eventDate: 1, createdAt: 1 });

        const blockchainStatus = await getBlockchainStatus();
        let verificationResult = 'Pending';
        let resultSummary = 'No supply-chain journey events recorded yet.';

        if (priorEvents.length > 0) {
            const hasAnchored = priorEvents.some(
                (e) => e.blockchainHash && e.transactionHash
            );

            if (hasAnchored && (!blockchainStatus.connected || !blockchainStatus.contractDeployed)) {
                verificationResult = 'Blockchain Offline';
                resultSummary = 'Consumer scanned QR code while blockchain node was offline; verification pending.';
            } else {
                const checks = await Promise.all(
                    priorEvents.map((e) => verifyEventOnBlockchain(e))
                );
                const verifiedCount = checks.filter((c) => c.status === 'Verified').length;
                const modifiedCount = checks.filter(
                    (c) => c.status === 'Modified' || c.status === 'Not Found On-Chain'
                ).length;
                const pendingCount = checks.filter((c) => c.status === 'Pending').length;

                if (modifiedCount > 0) {
                    verificationResult = 'Modified';
                    resultSummary = `Tampering Detected: ${modifiedCount} of ${priorEvents.length} supply-chain event(s) did not match on-chain records.`;
                } else if (verifiedCount === priorEvents.length) {
                    verificationResult = 'Verified';
                    resultSummary = `Verified Authentic: All ${verifiedCount} of ${priorEvents.length} supply-chain event(s) matched immutable Ethereum records.`;
                } else if (verifiedCount > 0 && pendingCount > 0) {
                    verificationResult = 'Partially Verified';
                    resultSummary = `Partially Verified: ${verifiedCount} verified, ${pendingCount} pending on-chain recording.`;
                } else {
                    verificationResult = 'Pending';
                    resultSummary = `Pending Verification: ${pendingCount} supply-chain event(s) awaiting on-chain confirmation.`;
                }
            }
        }

        const verifierIdentity =
            (req.user && req.user.name) ||
            (consumerName && consumerName.trim()) ||
            'Consumer (QR Scanner)';

        const verifyLocation =
            (location && location.trim()) || 'Consumer Device (QR Scan)';

        const verificationTime = new Date();

        const event = await JourneyEvent.create({
            productId,
            eventType: 'Consumer Verification',
            location: verifyLocation,
            description: `Verification Result: ${verificationResult} — ${resultSummary}`,
            performedBy: verifierIdentity,
            eventDate: verificationTime,
            blockchainStatus: 'Pending'
        });

        let blockchainRecorded = false;

        try {
            const chainResult = await recordEventOnBlockchain(event);
            event.blockchainHash = chainResult.blockchainHash;
            event.transactionHash = chainResult.transactionHash;
            event.blockNumber = chainResult.blockNumber;
            event.contractAddress = chainResult.contractAddress;
            event.blockchainStatus = 'Confirmed';
            event.blockchainError = null;
            event.blockchainRecordedAt = chainResult.blockchainRecordedAt;
            await event.save();
            blockchainRecorded = true;
        } catch (chainError) {
            event.blockchainStatus = 'Pending';
            event.blockchainError = chainError.message;
            await event.save();
        }

        if (verificationResult === 'Verified') {
            product.status = 'Verified';
            await product.save();
        }

        res.status(201).json({
            success: true,
            message: 'Consumer verification event recorded successfully',
            verificationResult,
            blockchainRecorded,
            event,
            product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get complete journey history of a product
router.get('/:productId', optionalProtect, async (req, res) => {
    try {
        if (!isStaffUser(req.user)) {
            const missingStages = await getMissingStagesForProduct(req.params.productId);
            if (missingStages.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: `Journey details are visible to consumers only after completing Production, Processing, Transportation, and Distribution. Pending stages: ${missingStages.join(', ')}.`
                });
            }
        }

        const events = await JourneyEvent.find({
            productId: req.params.productId
        }).sort({ eventDate: 1, createdAt: 1 });

        res.status(200).json({
            success: true,
            count: events.length,
            events
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
