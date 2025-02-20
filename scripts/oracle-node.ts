import { ethers } from "hardhat";
import { Contract } from "ethers";
import axios from "axios";
import dotenv from "dotenv";
import { SecureProcessor } from "../tee/enclave/secureProcessor";
import { TeeKeyManager } from "../tee/enclave/KeyManager";
import { IOracleRegistry } from "../typechain-types/contracts/interfaces/IOracleRegistry";
import { IRequestRegistry } from "../typechain-types/contracts/interfaces/IRequestRegistry";
import { IDataVerification } from "../typechain-types/contracts/interfaces/IDataVerification";

dotenv.config();

async function main() {
    try {
        // Initialize TEE components
        const teeKeyManager = TeeKeyManager.initialize();
        const secureProcessor = new SecureProcessor();
        
        // Log the public key that should be used for encryption
        console.log("TEE Public Key:", teeKeyManager.getPublicKey());

        // Get the provider and signer
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
        console.log("Starting oracle node...");
        console.log("Oracle address:", await signer.getAddress());

        // Update contract addresses from new deployment
        const CONSUMER_INTERFACE = "0x87f2dCDc925daCCE280ec0CcE6B55Ab4A958C3dC";
        const REQUEST_REGISTRY = "0xd94A42f0c077b682a6CE4C4eE83ae0267bEd7fd4";
        const DATA_VERIFICATION = "0xc69903fB5F68466334F9C587660cC849216a32Eb";
        const ORACLE_REGISTRY = "0xF6bceea4aCbcf61a2190959FCC99680304c66073";

        // Validate addresses
        [CONSUMER_INTERFACE, REQUEST_REGISTRY, DATA_VERIFICATION, ORACLE_REGISTRY].forEach(address => {
            if (!ethers.isAddress(address)) {
                throw new Error(`Invalid contract address: ${address}`);
            }
        });

        // Get contract instances
        const ConsumerInterface = await ethers.getContractFactory("ConsumerInterface");
        const RequestRegistry = await ethers.getContractFactory("RequestRegistry");
        const DataVerification = await ethers.getContractFactory("DataVerification");
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");

        const consumerInterface = ConsumerInterface.attach(CONSUMER_INTERFACE).connect(signer);
        const requestRegistry = (RequestRegistry.attach(REQUEST_REGISTRY).connect(signer)) as any as IRequestRegistry;
        const dataVerification = (DataVerification.attach(DATA_VERIFICATION).connect(signer)) as any as IDataVerification;
        const oracleRegistry = (OracleRegistry.attach(ORACLE_REGISTRY).connect(signer)) as any as IOracleRegistry;

        // Check if registered as oracle
        try {
            const providerInfo = await oracleRegistry.getProvider(await signer.getAddress());
            
            if (!providerInfo || !providerInfo.isActive) {
                console.log("Registering as new oracle...");
                const pubKeyHex = ethers.hexlify(ethers.randomBytes(32));
                console.log("Registering with key:", pubKeyHex);
                
                const registerTx = await oracleRegistry.registerProvider(
                    "BTC Price Oracle",
                    "JSON",
                    300,
                    pubKeyHex
                );
                await registerTx.wait();
                console.log("Oracle registered!");
            } else {
                console.log("Already registered as oracle");
                // Check if we need to update TEE key
                if (!providerInfo.teePublicKey || providerInfo.teePublicKey === "0x") {
                    console.log("Updating TEE public key...");
                    const pubKeyHex = ethers.hexlify(ethers.randomBytes(32));
                    const rotateTx = await oracleRegistry.rotateTeeKey(pubKeyHex);
                    await rotateTx.wait();
                    console.log("TEE key updated!");
                }
            }
        } catch (error: any) {
            console.error("Error in oracle setup:", error.message);
        }

        // Listen for new requests
        console.log("Listening for new requests...");
        
        consumerInterface.on("RequestSubmitted", async (requester, requestId, parameters) => {
            console.log(`\nNew request received:`);
            console.log(`Request ID: ${requestId}`);
            console.log("Raw parameters:", parameters);
            
            try {
                // Get request details from registry
                const request = await requestRegistry.requests(requestId);
                console.log("Request from registry:", {
                    encryptedDataLength: request.encryptedData.length,
                    metadataLength: request.requestMetadata.length
                });
                
                // Convert the contract data back to the correct format
                const encryptedDataStr = ethers.toUtf8String(request.encryptedData);

                // Process request in TEE
                const { result, attestation } = await secureProcessor.processEncryptedRequest(
                    encryptedDataStr
                );

                // Submit result with attestation
                const dataHash = ethers.keccak256(ethers.toUtf8Bytes(result));
                console.log("Submitting result with attestation...");
                
                // Will be replaced with real ZK proof later
                const dummyProof = ethers.randomBytes(32);
                
                const submitTx = await dataVerification.submitVerification(
                    requestId,
                    dataHash,
                    dummyProof,
                    attestation
                );
                await submitTx.wait();
                console.log(`Result submitted for request ${requestId}`);

            } catch (error) {
                console.error("Error processing request:", error);
            }
        });

        console.log("\nOracle node is running and waiting for requests...");

    } catch (error) {
        console.error("Error in oracle node:", error);
    }
}

// Keep the process running
process.on('SIGINT', () => {
    console.log('Oracle node stopped');
    process.exit();
});

main().catch((error) => {
    console.error(error);
    process.exit(1);
}); 