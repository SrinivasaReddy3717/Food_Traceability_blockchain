const JourneyEvent = require('../models/JourneyEvent');

const REQUIRED_SUPPLY_CHAIN_STAGES = [
    'Production',
    'Processing',
    'Transportation',
    'Distribution'
];

const STAFF_ROLES = [
    'Admin',
    'Farmer',
    'Producer',
    'Processor',
    'Transporter',
    'Distributor'
];

function isStaffUser(user) {
    return Boolean(user && STAFF_ROLES.includes(user.role));
}

async function getMissingStagesForProduct(productId) {
    const presentTypes = await JourneyEvent.distinct('eventType', { productId });
    const presentSet = new Set(presentTypes);
    return REQUIRED_SUPPLY_CHAIN_STAGES.filter((stage) => !presentSet.has(stage));
}

async function getReadyProductIds() {
    const readyDocs = await JourneyEvent.aggregate([
        { $match: { eventType: { $in: REQUIRED_SUPPLY_CHAIN_STAGES } } },
        { $group: { _id: '$productId', stages: { $addToSet: '$eventType' } } },
        {
            $match: {
                $expr: {
                    $eq: [{ $size: '$stages' }, REQUIRED_SUPPLY_CHAIN_STAGES.length]
                }
            }
        }
    ]);
    return readyDocs.map((doc) => doc._id);
}

module.exports = {
    REQUIRED_SUPPLY_CHAIN_STAGES,
    isStaffUser,
    getMissingStagesForProduct,
    getReadyProductIds
};

