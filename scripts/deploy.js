const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying EventChain contracts...");
  
  // Get the contract factory
  const EventChainContract = await ethers.getContractFactory("EventChainContract");
  const EventChainEventManagerContract = await ethers.getContractFactory("EventChainEventManagerContract");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
  
  // Deploy EventChainContract first
  console.log("Deploying EventChainContract...");
  const eventChainContract = await EventChainContract.deploy(deployer.address);
  await eventChainContract.waitForDeployment();
  const eventChainAddress = await eventChainContract.getAddress();
  console.log("EventChainContract deployed to:", eventChainAddress);
  
  // Deploy EventChainEventManagerContract
  console.log("Deploying EventChainEventManagerContract...");
  const eventManagerContract = await EventChainEventManagerContract.deploy(deployer.address, eventChainAddress);
  await eventManagerContract.waitForDeployment();
  const eventManagerAddress = await eventManagerContract.getAddress();
  console.log("EventChainEventManagerContract deployed to:", eventManagerAddress);
  
  console.log("\n🎉 Deployment successful!");
  console.log("EventChainContract:", eventChainAddress);
  console.log("EventChainEventManagerContract:", eventManagerAddress);

  // Persist deployment info for the server/UI
  const outDir = path.join(process.cwd(), "deployment");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }
  const deploymentPath = path.join(outDir, "deployment.json");
  const network = await deployer.provider.getNetwork();
  const data = {
    network: {
      chainId: Number(network.chainId),
      name: network.name || "localhost"
    },
    contracts: {
      EventChainContract: eventChainAddress,
      EventChainEventManagerContract: eventManagerAddress
    }
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(data, null, 2));
  console.log(`\nSaved deployment → ${deploymentPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
