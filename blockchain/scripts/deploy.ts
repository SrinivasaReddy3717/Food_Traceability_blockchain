import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  console.log("Deploying BloodManagement contract...");

  const BloodManagement = await ethers.getContractFactory(
    "BloodManagement"
  );

  const bloodManagement = await BloodManagement.deploy();

  await bloodManagement.waitForDeployment();

  const contractAddress = await bloodManagement.getAddress();

  console.log("BloodManagement deployed successfully!");
  console.log("Contract address:", contractAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});