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

        // 1. Register as a provider
        console.log("Registering as provider...");
        const tx = await registry.registerProvider(
            "BTC Price Feed",  // name
            "JSON",           // dataFormat
            300              // updateFrequency (5 minutes)
        );
        await tx.wait();
        console.log("Provider registered!");

        // 2. Submit test data
        console.log("Submitting test data...");
        const testData = "BTC:45000USD";
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));
        const submitTx = await registry.submitDataHash(dataHash);
        await submitTx.wait();
        console.log("Data submitted!");

        // 3. Read provider info
        const providerInfo = await registry.getProvider(await signer.getAddress());
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