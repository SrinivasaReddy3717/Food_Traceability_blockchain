const { ethers } = require("ethers");
const contractArtifact = require("./BloodManagement.json");

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY;
const BLOOD_BANK_PRIVATE_KEY = process.env.BLOOD_BANK_PRIVATE_KEY;
const HOSPITAL_PRIVATE_KEY = process.env.HOSPITAL_PRIVATE_KEY;

if (!RPC_URL) {
  throw new Error("BLOCKCHAIN_RPC_URL is not configured");
}

if (!CONTRACT_ADDRESS) {
  throw new Error("CONTRACT_ADDRESS is not configured");
}

if (!ADMIN_PRIVATE_KEY) {
  throw new Error("BLOCKCHAIN_PRIVATE_KEY is not configured");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Admin wallet
const adminWallet = new ethers.Wallet(
  ADMIN_PRIVATE_KEY,
  provider
);

// Admin contract
const adminContract = new ethers.Contract(
  CONTRACT_ADDRESS,
  contractArtifact.abi,
  adminWallet
);

// Blood Bank wallet/contract
let bloodBankWallet = null;
let bloodBankContract = null;

if (BLOOD_BANK_PRIVATE_KEY) {
  bloodBankWallet = new ethers.Wallet(
    BLOOD_BANK_PRIVATE_KEY,
    provider
  );

  bloodBankContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    bloodBankWallet
  );
}

// Hospital wallet/contract
let hospitalWallet = null;
let hospitalContract = null;

if (HOSPITAL_PRIVATE_KEY) {
  hospitalWallet = new ethers.Wallet(
    HOSPITAL_PRIVATE_KEY,
    provider
  );

  hospitalContract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    hospitalWallet
  );
}

module.exports = {
  provider,

  adminWallet,
  adminContract,

  bloodBankWallet,
  bloodBankContract,

  hospitalWallet,
  hospitalContract,
};