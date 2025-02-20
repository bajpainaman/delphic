import { ethers } from "hardhat";
import { Contract, EventLog } from "ethers";
import dotenv from "dotenv";
import { RequestBuilder } from "../tee/consumer/requestBuilder";
import { TeeKeyManager } from "../tee/enclave/KeyManager";
import { ConsumerInterface, DataVerification, RequestRegistry } from "../typechain-types";

dotenv.config();

async function main() {
    try {
        console.log("\n🚀 Starting live test...");

        // Get the provider and signer
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY || "", provider);
        console.log("📝 Using account:", await signer.getAddress());

        // Contract addresses
        const CONSUMER_INTERFACE = "0x87f2dCDc925daCCE280ec0CcE6B55Ab4A958C3dC";

        // Get contract instances
        const consumerInterface = new ethers.Contract(
            CONSUMER_INTERFACE,
            [
                "function submitRequest(bytes,bytes,string) payable returns (uint256)",
                "function requestRegistry() view returns (address)"
            ],
            signer
        );

        // Get RequestRegistry instance
        const RequestRegistry = await ethers.getContractFactory("RequestRegistry");
        const registryAddress = await consumerInterface.requestRegistry();
        const registry = RequestRegistry.attach(registryAddress).connect(signer) as unknown as RequestRegistry;

        // Enhanced debug information
        console.log("\n📋 Contract Details:");
        console.log("- Consumer Interface address:", CONSUMER_INTERFACE);
        console.log("- Request Registry address:", registryAddress);
        
        // Check contract states
        const isPaused = await registry.paused();
        const registryOwner = await registry.owner();
        console.log("\n🔒 Contract States:");
        console.log("- Registry owner:", registryOwner);
        console.log("- Registry paused:", isPaused);
        console.log("- Current user:", await signer.getAddress());

        // Initialize TEE components
        console.log("\n🔒 Initializing TEE components...");
        const teeKeyManager = TeeKeyManager.initialize();
        const requestBuilder = new RequestBuilder(teeKeyManager.getPublicKey());

        // Step 1: Initial data preparation
        console.log("\n1️⃣ Initial Data:", {
            apiKey: process.env.API_KEY?.slice(0, 10) + "...",
            endpoint: "https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT",
            parameters: '{"currency": "USD"}'
        });

        // Step 2: Build encrypted request
        console.log("\n2️⃣ Building encrypted request...");
        const { encryptedData, requestMetadata } = await requestBuilder.buildEncryptedRequest(
            process.env.API_KEY || "",
            "https://api.binance.us/api/v3/ticker/price?symbol=BTCUSDT",
            '{"currency": "USD"}'
        );

        // Step 3: Check encrypted data format
        console.log("\n3️⃣ Encrypted Data Format:", {
            encryptedData: {
                type: typeof encryptedData,
                length: encryptedData.length,
                hasHexPrefix: encryptedData.startsWith('0x'),
                sample: encryptedData.slice(0, 50) + "..."
            },
            requestMetadata: {
                type: typeof requestMetadata,
                length: requestMetadata.length,
                hasHexPrefix: requestMetadata.startsWith('0x'),
                sample: requestMetadata.slice(0, 50) + "..."
            }
        });

        // Step 4: Function encoding
        console.log("\n4️⃣ Encoding function call...");
        const data = consumerInterface.interface.encodeFunctionData("submitRequest", [
            requestMetadata,
            encryptedData,
            "price_feed"
        ]);

        console.log("Encoded function data:", {
            length: data.length,
            functionSelector: data.slice(0, 10),
            fullData: data.slice(0, 66) + "..."
        });

        // Step 5: Transaction preparation
        const tx = {
            to: CONSUMER_INTERFACE,
            data: data,
            value: ethers.parseEther("0.0001"),
            gasLimit: 500000,
            maxFeePerGas: ethers.parseUnits("20", "gwei"),
            maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
            nonce: await provider.getTransactionCount(await signer.getAddress()),
            chainId: 11155111
        };

        console.log("\n5️⃣ Final Transaction:", {
            to: tx.to,
            dataLength: tx.data.length,
            dataPrefix: tx.data.slice(0, 66),
            value: tx.value.toString()
        });

        // Step 6: Send transaction
        console.log("\n6️⃣ Sending transaction...");
        const signedTx = await signer.signTransaction(tx);
        const requestTx = await provider.send("eth_sendRawTransaction", [signedTx]);

        console.log("Transaction submitted:", requestTx);
        
        // Wait for transaction with more detailed status
        console.log("Waiting for transaction confirmation...");
        const receipt = await provider.waitForTransaction(requestTx);
        
        console.log("\n🔄 Transaction Result:");
        console.log("- Status:", receipt?.status ? "Success" : "Failed");
        console.log("- Gas used:", receipt?.gasUsed.toString());
        
        // After getting the receipt
        if (!receipt?.status) {
            // Try to get the revert reason
            const tx = await provider.getTransaction(requestTx);
            try {
                await provider.call(tx as any);
            } catch (err: any) {
                console.log("\n❌ Transaction Revert Reason:", err.data?.message || err.message);
                
                // Try to decode a custom error if present
                if (err.data) {
                    try {
                        const decodedError = consumerInterface.interface.parseError(err.data);
                        console.log("Decoded error:", decodedError);
                    } catch (e) {
                        console.log("Raw error data:", err.data);
                    }
                }
                
                // Try to simulate the transaction to get more details
                try {
                    const result = await provider.call({
                        ...tx,
                        gasLimit: 15000000 // Increase gas limit for simulation
                    });
                    console.log("Simulation result:", result);
                } catch (simError: any) {
                    console.log("Simulation error:", {
                        message: simError.message,
                        data: simError.data,
                        code: simError.code,
                        reason: simError.reason
                    });
                }
            }
        }

        // Parse events even if failed
        if (receipt?.logs) {
            console.log("\n📊 Event Logs (including pre-revert):");
            for (const log of receipt.logs) {
                try {
                    const parsedLog = consumerInterface.interface.parseLog({
                        topics: log.topics as string[],
                        data: log.data
                    });
                    if (parsedLog) {
                        console.log(`- Event ${parsedLog.name}:`, parsedLog.args);
                    }
                } catch (e) {
                    // Skip logs that aren't from our contract
                    console.log("- Raw log:", log);
                }
            }
        }

    } catch (error) {
        console.error("\n❌ Script failed:", error);
    }
}

main().catch(console.error);
