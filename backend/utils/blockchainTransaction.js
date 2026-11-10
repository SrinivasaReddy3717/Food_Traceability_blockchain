const BlockchainTransaction = require("../models/BlockchainTransaction");

async function saveBlockchainTransaction({
  requestId = null,
  bloodUnitId = null,
  fromAddress,
  toAddress,
  transactionHash,
  action,
}) {
  const transaction = new BlockchainTransaction({
    transactionId: `TX-${Date.now()}`,
    requestId,
    bloodUnitId,
    fromAddress,
    toAddress,
    transactionHash,
    action,
    timestamp: new Date(),
  });

  return await transaction.save();
}

module.exports = {
  saveBlockchainTransaction,
};