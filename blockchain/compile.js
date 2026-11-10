const fs = require('fs');
const path = require('path');

let solc;
try {
    solc = require('solc');
} catch {
    solc = require(path.join(__dirname, '../backend/node_modules/solc'));
}

const contractPath = path.join(__dirname, 'contracts', 'FoodTraceability.sol');
const buildDir = path.join(__dirname, 'build');
const outputPath = path.join(buildDir, 'FoodTraceability.json');

const source = fs.readFileSync(contractPath, 'utf8');

const input = {
    language: 'Solidity',
    sources: {
        'FoodTraceability.sol': {
            content: source,
        },
    },
    settings: {
        evmVersion: 'paris',
        optimizer: {
            enabled: true,
            runs: 200,
        },
        outputSelection: {
            '*': {
                '*': ['abi', 'evm.bytecode'],
            },
        },
    },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors && output.errors.length > 0) {
    const fatalErrors = output.errors.filter((err) => err.severity === 'error');
    for (const err of output.errors) {
        console.error(err.formattedMessage);
    }
    if (fatalErrors.length > 0) {
        process.exit(1);
    }
}

const contract = output.contracts['FoodTraceability.sol']['FoodTraceability'];

if (!contract || !contract.evm || !contract.evm.bytecode || !contract.evm.bytecode.object) {
    console.error('Compilation failed: Contract bytecode not generated.');
    process.exit(1);
}

fs.mkdirSync(buildDir, { recursive: true });

const artifact = {
    contractName: 'FoodTraceability',
    compilerVersion: solc.version(),
    evmVersion: 'paris',
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    compiledAt: new Date().toISOString(),
};

fs.writeFileSync(outputPath, JSON.stringify(artifact, null, 2), 'utf8');

console.log('Smart contract compiled successfully!');
console.log(`Artifact saved to: ${outputPath}`);

