import { ethers } from "hardhat";
import type { Contract } from "ethers";
import { SecureProcessor } from "../tee/enclave/secureProcessor";
import { TeeKeyManager } from "../tee/enclave/KeyManager";

async function main() {
    try {
        // Initialize TEE components
        const teeKeyManager = TeeKeyManager.initialize();
        const secureProcessor = new SecureProcessor();

        // Get the provider and signer
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
        console.log("Using account:", await signer.getAddress());

        // Contract address from your deployment
        const CONTRACT_ADDRESS = "0xF6bceea4aCbcf61a2190959FCC99680304c66073"
        
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
        const registry = OracleRegistry.attach(CONTRACT_ADDRESS).connect(signer) as Contract;

        // 1. Register as a provider with TEE public key
        console.log("Registering as provider...");
        const tx = await registry.registerProvider(
            "BTC Price Feed",
            "JSON",
            300,
            teeKeyManager.getPublicKey() // Add TEE public key
        );
        await tx.wait();
        console.log("Provider registered!");

        // 2. Test secure data processing
        console.log("Testing secure processing...");
        const encryptedData = "test-encrypted-data";
        const { result, attestation } = await secureProcessor.processEncryptedRequest(encryptedData);
        
        const dataHash = ethers.keccak256(ethers.toUtf8Bytes(result));
        console.log("Secure processing successful!");

        // 3. Submit test data
        console.log("Submitting test data...");
        const submitTx = await registry.submitDataHash(dataHash);
        await submitTx.wait();
        console.log("Data submitted!");

        // 4. Read provider info
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