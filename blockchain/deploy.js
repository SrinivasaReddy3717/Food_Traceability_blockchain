const fs = require('fs');
const path = require('path');

let ethers;
let dotenv;
try {
    ethers = require('ethers');
} catch {
    ethers = require(path.join(__dirname, '../backend/node_modules/ethers'));
}
try {
    dotenv = require('dotenv');
} catch {
    dotenv = require(path.join(__dirname, '../backend/node_modules/dotenv'));
}

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const artifactPath = path.join(__dirname, 'build', 'FoodTraceability.json');
const deploymentPath = path.join(__dirname, 'build', 'deployedContract.json');

const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:8545';

async function deploy() {
    if (!fs.existsSync(artifactPath)) {
        console.error('Compiled artifact not found. Run compile.js first.');
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log(`Connecting to Ganache RPC at ${GANACHE_URL}...`);
    const provider = new ethers.JsonRpcProvider(GANACHE_URL);

    const network = await provider.getNetwork();
    const signer = await provider.getSigner(0);
    const deployerAddress = await signer.getAddress();
    const balance = await provider.getBalance(deployerAddress);

    console.log(`Connected! Chain ID: ${network.chainId.toString()}`);
    console.log(`Deployer Account: ${deployerAddress}`);
    console.log(`Account Balance: ${ethers.formatEther(balance)} ETH`);

    const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        signer
    );

    console.log('Deploying FoodTraceability smart contract...');
    const contract = await factory.deploy();
    const deploymentTx = contract.deploymentTransaction();

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    const receipt = deploymentTx ? await deploymentTx.wait() : null;

    const deployedCode = await provider.getCode(contractAddress);
    if (!deployedCode || deployedCode === '0x') {
        throw new Error('Contract deployment verification failed: empty bytecode on-chain.');
    }

    const deploymentInfo = {
        contractName: artifact.contractName,
        contractAddress,
        deployerAddress,
        transactionHash: deploymentTx ? deploymentTx.hash : null,
        blockNumber: receipt ? Number(receipt.blockNumber) : null,
        chainId: Number(network.chainId),
        rpcUrl: GANACHE_URL,
        deployedAt: new Date().toISOString(),
        abi: artifact.abi,
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2), 'utf8');

    console.log('--------------------------------------------------');
    console.log('FoodTraceability contract deployed successfully!');
    console.log(`Contract Address : ${contractAddress}`);
    console.log(`Transaction Hash : ${deploymentInfo.transactionHash}`);
    console.log(`Block Number     : ${deploymentInfo.blockNumber}`);
    console.log(`Saved details to : ${deploymentPath}`);
    console.log('--------------------------------------------------');
}

deploy().catch((error) => {
    console.error('Deployment failed:', error.message);
    process.exit(1);
});

