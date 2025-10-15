const { ethers } = require("hardhat");

async function main() {
  // Contract addresses from deployment
  const eventChainAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const eventManagerAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  // Get contracts
  const eventChainContract = await ethers.getContractAt("EventChainContract", eventChainAddress);
  const eventManagerContract = await ethers.getContractAt("EventChainEventManagerContract", eventManagerAddress);
  
  const [owner] = await ethers.getSigners();
  console.log("Interacting with contracts using account:", owner.address);
  
  // Create an event
  console.log("\n📅 Creating an event...");
  const createEventTx = await eventManagerContract.createEvent(
    "Blockchain Conference 2024",
    "San Francisco, CA",
    "2024-12-15",
    ethers.parseEther("0.1") // 0.1 ETH ticket price
  );
  await createEventTx.wait();
  console.log("✅ Event created successfully!");
  
  // Get event details
  console.log("\n📋 Getting event details...");
  const eventDetails = await eventManagerContract.getEventDetails(0);
  console.log("Event Name:", eventDetails.name);
  console.log("Location:", eventDetails.location);
  console.log("Date:", eventDetails.date);
  console.log("Ticket Price:", ethers.formatEther(eventDetails.ticketPrice), "ETH");
  
  // Mint a ticket
  console.log("\n🎫 Minting a ticket...");
  const mintTicketTx = await eventManagerContract.mintTicket(
    0, // event ID
    owner.address, // recipient
    "https://example.com/ticket-metadata.json" // metadata URI
  );
  await mintTicketTx.wait();
  console.log("✅ Ticket minted successfully!");
  
  // Check ticket status
  console.log("\n🔍 Checking ticket status...");
  const ticketStatus = await eventChainContract.getTicketStatus(0);
  console.log("Ticket used:", ticketStatus.isUsed);
  console.log("Ticket valid:", ticketStatus.isValid);
  
  // Get ticket history
  console.log("\n📜 Getting ticket ownership history...");
  const ticketHistory = await eventChainContract.getTicketHistory(0);
  console.log("Ownership history:", ticketHistory);
  
  console.log("\n🎉 EventChain is working perfectly!");
  console.log("\nContract Addresses:");
  console.log("EventChainContract:", eventChainAddress);
  console.log("EventChainEventManagerContract:", eventManagerAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
