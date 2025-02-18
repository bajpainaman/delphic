import { ethers } from "hardhat";
import type { Contract } from "ethers";

async function main() {
    try {
        // Get the provider and signer
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
        console.log("Using account:", await signer.getAddress());

        // Contract address from your deployment
        const CONTRACT_ADDRESS = "0x64feD8fBfd3a2F1adb7D802DbB09D9CE7acf8599";
        
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
        const registry = OracleRegistry.attach(CONTRACT_ADDRESS).connect(signer) as Contract;

        // 1. Get all provider addresses
        const providerAddress = "0xa814960B52E422E395fDd4bf59FA5437fF189B34"; // Your address from earlier
        
        // 2. Get provider details
        console.log("\nFetching provider details...");
        const providerInfo = await registry.getProvider(providerAddress);
        console.log("Provider Info:", {
            name: providerInfo.name,
            dataFormat: providerInfo.dataFormat,
            updateFrequency: providerInfo.updateFrequency.toString(),
            isActive: providerInfo.isActive,
            reputation: providerInfo.reputation.toString()
        });

    } catch (error) {
        console.error("Error:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });