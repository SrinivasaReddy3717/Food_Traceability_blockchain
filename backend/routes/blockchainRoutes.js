const express = require('express');
const router = express.Router();

const Product = require('../models/Product');
const JourneyEvent = require('../models/JourneyEvent');
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

// Live Ganache connection & smart contract status
router.get('/status', async (req, res) => {
    const status = await getBlockchainStatus();
    res.status(status.connected ? 200 : 503).json({
        success: status.connected,
        blockchain: status
    });
});

// Verify all journey events of a product against Ganache smart contract
router.get('/verify/:productId', optionalProtect, async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await Product.findOne({ productId });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (!isStaffUser(req.user)) {
            const missingStages = await getMissingStagesForProduct(productId);
            if (missingStages.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: `Blockchain verification is available to consumers after completing Production, Processing, Transportation, and Distribution. Pending stages: ${missingStages.join(', ')}.`
                });
            }
        }

        const events = await JourneyEvent.find({ productId }).sort({
            eventDate: 1,
            createdAt: 1
        });

        const blockchainStatus = await getBlockchainStatus();

        if (events.length === 0) {
            return res.status(200).json({
                success: true,
                product,
                blockchain: blockchainStatus,
                overallStatus: 'No Events',
                verified: false,
                summary: {
                    totalEvents: 0,
                    verifiedCount: 0,
                    pendingCount: 0,
                    modifiedCount: 0
                },
                events: []
            });
        }

        // Check if there are anchored events while Ganache is offline
        const hasAnchoredEvents = events.some(
            (event) => event.blockchainHash && event.transactionHash
        );

        if (hasAnchoredEvents && (!blockchainStatus.connected || !blockchainStatus.contractDeployed)) {
            return res.status(503).json({
                success: false,
                product,
                blockchain: blockchainStatus,
                overallStatus: 'Blockchain Offline',
                verified: false,
                message:
                    blockchainStatus.error ||
                    'Ganache local blockchain is offline or contract is not deployed. Start Ganache to verify on-chain records.',
                summary: {
                    totalEvents: events.length,
                    verifiedCount: 0,
                    pendingCount: events.filter((e) => !e.blockchainHash || !e.transactionHash).length,
                    modifiedCount: 0
                },
                events: events.map((event) => ({
                    eventId: String(event._id),
                    eventType: event.eventType,
                    location: event.location,
                    performedBy: event.performedBy,
                    eventDate: event.eventDate,
                    status: event.transactionHash ? 'Unverified (Node Offline)' : 'Pending',
                    verified: false,
                    tampered: false,
                    computedHash: null,
                    storedMongoHash: event.blockchainHash,
                    onChainHash: null,
                    transactionHash: event.transactionHash,
                    blockNumber: event.blockNumber,
                    message: 'Cannot verify without a running Ganache blockchain node.'
                }))
            });
        }

        const verifiedEvents = await Promise.all(
            events.map((event) => verifyEventOnBlockchain(event))
        );

        const verifiedCount = verifiedEvents.filter((e) => e.status === 'Verified').length;
        const pendingCount = verifiedEvents.filter((e) => e.status === 'Pending').length;
        const modifiedCount = verifiedEvents.filter(
            (e) => e.status === 'Modified' || e.status === 'Not Found On-Chain'
        ).length;

        let overallStatus = 'Pending';
        if (modifiedCount > 0) {
            overallStatus = 'Modified';
        } else if (verifiedCount === events.length) {
            overallStatus = 'Verified';
        } else if (verifiedCount > 0 && pendingCount > 0) {
            overallStatus = 'Partially Verified';
        }

        res.status(200).json({
            success: true,
            product,
            blockchain: blockchainStatus,
            overallStatus,
            verified: overallStatus === 'Verified',
            summary: {
                totalEvents: events.length,
                verifiedCount,
                pendingCount,
                modifiedCount
            },
            events: verifiedEvents
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Verify a single journey event by MongoDB _id
router.get('/verify-event/:eventId', async (req, res) => {
    try {
        const event = await JourneyEvent.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: 'Journey event not found'
            });
        }

        const result = await verifyEventOnBlockchain(event);
        res.status(200).json({
            success: true,
            verification: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Anchor a pending JourneyEvent onto the Ganache smart contract
router.post(
    '/sync/:eventId',
    protect,
    authorizeRoles('Admin', 'Farmer', 'Producer', 'Processor', 'Transporter', 'Distributor'),
    async (req, res) => {
        try {
            const event = await JourneyEvent.findById(req.params.eventId);
            if (!event) {
                return res.status(404).json({
                    success: false,
                    message: 'Journey event not found'
                });
            }

            if (event.blockchainStatus === 'Confirmed' && event.transactionHash) {
                return res.status(200).json({
                    success: true,
                    message: 'Journey event is already confirmed on the blockchain',
                    event
                });
            }

            const chainResult = await recordEventOnBlockchain(event);

            event.blockchainHash = chainResult.blockchainHash;
            if (chainResult.transactionHash) {
                event.transactionHash = chainResult.transactionHash;
            }
            if (chainResult.blockNumber !== null && chainResult.blockNumber !== undefined) {
                event.blockNumber = chainResult.blockNumber;
            }
            event.contractAddress = chainResult.contractAddress;
            event.blockchainStatus = 'Confirmed';
            event.blockchainError = null;
            event.blockchainRecordedAt = chainResult.blockchainRecordedAt;

            await event.save();

            res.status(200).json({
                success: true,
                message: 'Journey event successfully recorded on the blockchain',
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

module.exports = router;

