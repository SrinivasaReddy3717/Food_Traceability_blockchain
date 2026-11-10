const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const DEPLOYED_CONTRACT_PATH = path.join(
    __dirname,
    '../../blockchain/build/deployedContract.json'
);

/**
 * Build deterministic canonical SHA-256 hash (0x-prefixed 32-byte hex)
 * from immutable journey event fields stored in MongoDB.
 */
function computeEventHash(event) {
    const canonicalPayload = {
        eventId: String(event._id),
        productId: String(event.productId),
        eventType: String(event.eventType),
        location: String(event.location),
        description: String(event.description),
        performedBy: String(event.performedBy),
        eventDate: new Date(event.eventDate).toISOString()
    };

    const digest = crypto
        .createHash('sha256')
        .update(JSON.stringify(canonicalPayload))
        .digest('hex');

    return `0x${digest}`;
}

/**
 * Read deployed contract configuration from blockchain/build/deployedContract.json.
 */
function loadDeploymentConfig() {
    if (!fs.existsSync(DEPLOYED_CONTRACT_PATH)) {
        throw new Error(
            'Smart contract deployment file not found. Run deployment first.'
        );
    }

    const deployment = JSON.parse(
        fs.readFileSync(DEPLOYED_CONTRACT_PATH, 'utf8')
    );

    const contractAddress =
        process.env.CONTRACT_ADDRESS || deployment.contractAddress;
    const rpcUrl =
        process.env.GANACHE_URL ||
        deployment.rpcUrl ||
        'http://127.0.0.1:8545';

    if (!contractAddress || !deployment.abi) {
        throw new Error('Invalid smart contract deployment configuration.');
    }

    return {
        contractName: deployment.contractName || 'FoodTraceability',
        contractAddress,
        rpcUrl,
        abi: deployment.abi
    };
}

/**
 * Connect to Ganache RPC and ensure the smart contract is deployed at address.
 */
async function getBlockchainConnection({ withSigner = false, overrideAddress = null } = {}) {
    const config = loadDeploymentConfig();
    const targetAddress = overrideAddress || config.contractAddress;
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    const network = await provider.getNetwork();
    const code = await provider.getCode(targetAddress);

    if (!code || code === '0x') {
        throw new Error(
            `No contract bytecode found at ${targetAddress} on ${config.rpcUrl}. Start Ganache with persistent DB or redeploy the smart contract.`
        );
    }

    let signerOrProvider = provider;
    if (withSigner) {
        signerOrProvider = await provider.getSigner(0);
    }

    const contract = new ethers.Contract(
        targetAddress,
        config.abi,
        signerOrProvider
    );

    return {
        provider,
        contract,
        contractAddress: targetAddress,
        rpcUrl: config.rpcUrl,
        chainId: Number(network.chainId)
    };
}

/**
 * Check live Ganache connectivity and contract deployment status.
 */
async function getBlockchainStatus() {
    try {
        const config = loadDeploymentConfig();
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        const [network, blockNumber, code] = await Promise.all([
            provider.getNetwork(),
            provider.getBlockNumber(),
            provider.getCode(config.contractAddress)
        ]);

        const contractDeployed = Boolean(code && code !== '0x');
        let totalEventsRecorded = 0;

        if (contractDeployed) {
            const contract = new ethers.Contract(
                config.contractAddress,
                config.abi,
                provider
            );
            totalEventsRecorded = Number(
                await contract.totalEventsRecorded()
            );
        }

        return {
            connected: true,
            contractDeployed,
            rpcUrl: config.rpcUrl,
            chainId: Number(network.chainId),
            latestBlock: Number(blockNumber),
            contractAddress: config.contractAddress,
            totalEventsRecorded
        };
    } catch (error) {
        return {
            connected: false,
            contractDeployed: false,
            rpcUrl: process.env.GANACHE_URL || 'http://127.0.0.1:8545',
            error: error.message
        };
    }
}

/**
 * Anchor a JourneyEvent SHA-256 hash onto Ganache via FoodTraceability.recordEvent.
 */
async function recordEventOnBlockchain(event) {
    const eventHash = computeEventHash(event);
    const { contract, contractAddress } = await getBlockchainConnection({
        withSigner: true
    });

    const eventId = String(event._id);

    // Avoid revert if this event was already anchored on-chain
    const [alreadyExists, isMatch, storedHash, timestamp] =
        await contract.verifyEvent(eventId, eventHash);

    if (alreadyExists) {
        return {
            alreadyRecorded: true,
            blockchainHash: storedHash,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            contractAddress,
            isMatch,
            blockchainRecordedAt: new Date(Number(timestamp) * 1000)
        };
    }

    const tx = await contract.recordEvent(
        event.productId,
        eventId,
        eventHash
    );
    const receipt = await tx.wait();

    return {
        alreadyRecorded: false,
        blockchainHash: eventHash,
        transactionHash: receipt.hash,
        blockNumber: Number(receipt.blockNumber),
        contractAddress,
        blockchainRecordedAt: new Date()
    };
}

/**
 * Recompute SHA-256 from MongoDB event and verify against Ganache smart contract.
 */
async function verifyEventOnBlockchain(event) {
    const computedHash = computeEventHash(event);

    if (!event.blockchainHash || !event.transactionHash) {
        return {
            eventId: String(event._id),
            eventType: event.eventType,
            location: event.location,
            performedBy: event.performedBy,
            eventDate: event.eventDate,
            status: 'Pending',
            verified: false,
            tampered: false,
            computedHash,
            storedMongoHash: event.blockchainHash || null,
            onChainHash: null,
            transactionHash: event.transactionHash || null,
            blockNumber: event.blockNumber || null,
            contractAddress: event.contractAddress || null,
            onChainTimestamp: null,
            recordedBy: null,
            message: 'Pending blockchain recording. Event is saved in MongoDB only.'
        };
    }

    const { provider, contract, contractAddress } = await getBlockchainConnection({
        withSigner: false,
        overrideAddress: event.contractAddress || null
    });

    const eventId = String(event._id);
    const [exists, isMatch, storedHash, timestamp, recordedBy] =
        await contract.verifyEvent(eventId, computedHash);
    const receipt = await provider.getTransactionReceipt(event.transactionHash);

    if (!exists || !receipt || receipt.status !== 1) {
        return {
            eventId,
            eventType: event.eventType,
            location: event.location,
            performedBy: event.performedBy,
            eventDate: event.eventDate,
            status: 'Not Found On-Chain',
            verified: false,
            tampered: true,
            computedHash,
            storedMongoHash: event.blockchainHash,
            onChainHash: exists ? storedHash : null,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            contractAddress,
            onChainTimestamp: exists
                ? new Date(Number(timestamp) * 1000).toISOString()
                : null,
            recordedBy: exists ? recordedBy : null,
            message: 'Transaction or event record could not be confirmed on Ganache.'
        };
    }

    const mongoHashMatches = event.blockchainHash === storedHash;
    const authentic = Boolean(isMatch && mongoHashMatches);

    return {
        eventId,
        eventType: event.eventType,
        location: event.location,
        performedBy: event.performedBy,
        eventDate: event.eventDate,
        status: authentic ? 'Verified' : 'Modified',
        verified: authentic,
        tampered: !authentic,
        computedHash,
        storedMongoHash: event.blockchainHash,
        onChainHash: storedHash,
        transactionHash: event.transactionHash,
        blockNumber: Number(receipt.blockNumber),
        contractAddress,
        onChainTimestamp: new Date(Number(timestamp) * 1000).toISOString(),
        recordedBy,
        message: authentic
            ? 'Authentic: MongoDB record matches the immutable on-chain SHA-256 hash.'
            : 'Data tampering detected: Current MongoDB fields do not match the blockchain hash.'
    };
}

module.exports = {
    computeEventHash,
    loadDeploymentConfig,
    getBlockchainConnection,
    getBlockchainStatus,
    recordEventOnBlockchain,
    verifyEventOnBlockchain
};

