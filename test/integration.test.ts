import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ApiKeyEncryption } from "../tee/consumer/apiKeyEncryption";
import { RequestBuilder } from "../tee/consumer/requestBuilder";
import { TeeKeyManager } from "../tee/enclave/KeyManager";
import { SecureProcessor } from "../tee/enclave/secureProcessor";

describe("Delphic Oracle Integration Tests", function () {
    // Contracts
    let consumerInterface: any;
    let requestRegistry: any;
    let dataVerification: any;
    let oracleRegistry: any;
    let paymentHandler: any;
    let owner: any;
    let oracle: any;
    let user: any;
    let teeKeyManager: any;

    // Signers
    let signer: SignerWithAddress;

    async function deployContracts() {
        // Get signers
        [signer] = await ethers.getSigners();

        // Deploy contracts
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
        const RequestRegistry = await ethers.getContractFactory("RequestRegistry");
        const DataVerification = await ethers.getContractFactory("DataVerification");
        const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
        const ConsumerInterface = await ethers.getContractFactory("ConsumerInterface");

        // Deploy in correct order
        oracleRegistry = await OracleRegistry.deploy();
        paymentHandler = await PaymentHandler.deploy(
            ethers.parseEther("0.01"), // baseFee
            ethers.parseEther("0.001"), // complexityFee
            ethers.parseEther("0.02"), // priorityFee
            500 // protocolFee (5%)
        );
        dataVerification = await DataVerification.deploy();
        requestRegistry = await RequestRegistry.deploy();
        consumerInterface = await ConsumerInterface.deploy(
            await requestRegistry.getAddress(),
            await dataVerification.getAddress()
        );

        return {
            oracleRegistry,
            requestRegistry,
            dataVerification,
            paymentHandler,
            consumerInterface,
            owner: signer,
            oracle: signer,
            user: signer
        };
    }

    describe("TEE Flow", function () {
        let requestBuilder: RequestBuilder;
        let secureProcessor: SecureProcessor;

        beforeEach(async function () {
            const contracts = await loadFixture(deployContracts);
            oracleRegistry = contracts.oracleRegistry;
            requestRegistry = contracts.requestRegistry;
            dataVerification = contracts.dataVerification;
            paymentHandler = contracts.paymentHandler;
            consumerInterface = contracts.consumerInterface;
            owner = contracts.owner;
            oracle = contracts.oracle;
            user = contracts.user;

            // Initialize TEE components
            teeKeyManager = TeeKeyManager.initialize();
            requestBuilder = new RequestBuilder(teeKeyManager.getPublicKey());
            secureProcessor = new SecureProcessor();
        });

        it("Should handle encrypted API key flow", async function () {
            // 1. Register Oracle
            await oracleRegistry.connect(oracle).registerProvider(
                "Test Oracle",
                "JSON",
                300
            );

            // 2. Build encrypted request
            const apiKey = "test-api-key-123";
            const apiEndpoint = "https://api.example.com/btc/price";
            const parameters = '{"currency": "USD"}';

            const { encryptedData, requestMetadata, requestHash } = 
                await requestBuilder.buildEncryptedRequest(
                    apiKey,
                    apiEndpoint,
                    parameters
                );

            // 3. Submit encrypted request
            const requestTx = await consumerInterface.connect(user).submitRequest(
                requestMetadata,
                encryptedData,
                "price_feed",
                { value: ethers.parseEther("0.1") }
            );

            const receipt = await requestTx.wait();
            const event = receipt?.logs.find(
                (log: any) => log.eventName === "RequestSubmitted"
            );
            const requestId = event?.args?.requestId;

            // 4. Oracle processes encrypted request in TEE
            const { result, attestation } = await secureProcessor.processEncryptedRequest(
                encryptedData
            );

            // 5. Submit result with attestation
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(result));
            const dummyProof = ethers.randomBytes(32); // Will be replaced with real ZK proof

            await dataVerification.connect(oracle).submitVerification(
                requestId,
                dataHash,
                dummyProof,
                attestation
            );

            // 6. Verify result
            const verificationStatus = await dataVerification.isVerified(requestId);
            expect(verificationStatus).to.be.true;

            const resultHash = await consumerInterface.getResult(requestId);
            expect(resultHash).to.equal(dataHash);
        });

        it("Should handle TEE attestation verification", async function () {
            // Test attestation verification
            // ... implement attestation verification test
        });

        it("Should handle TEE key rotation", async function () {
            // Test key rotation
            // ... implement key rotation test
        });
    });

    describe("End-to-End Flow", function () {
        beforeEach(async function () {
            const contracts = await loadFixture(deployContracts);
            oracleRegistry = contracts.oracleRegistry;
            requestRegistry = contracts.requestRegistry;
            dataVerification = contracts.dataVerification;
            paymentHandler = contracts.paymentHandler;
            consumerInterface = contracts.consumerInterface;
            owner = contracts.owner;
            oracle = contracts.oracle;
            user = contracts.user;
        });

        it("Should complete full request-response cycle", async function () {
            // 1. Register Oracle
            await oracleRegistry.connect(oracle).registerProvider(
                "Test Oracle",
                "JSON",
                300 // 5 minute update frequency
            );

            // 2. Submit Request
            const requestTx = await consumerInterface.connect(user).submitRequest(
                "https://api.example.com/btc/price",
                '{"currency": "USD"}',
                "price_feed",
                { value: ethers.parseEther("0.1") }
            );

            // Get RequestId from event
            const receipt = await requestTx.wait();
            const event = receipt?.logs.find(
                (log: any) => log.eventName === "RequestSubmitted"
            );
            const requestId = event?.args?.requestId;

            // 3. Oracle processes request and submits result
            const testData = "50000"; // Example BTC price
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes(testData));
            
            // Create dummy proof and attestation
            const dummyProof = ethers.randomBytes(32);
            const dummyAttestation = ethers.randomBytes(32);

            await dataVerification.connect(oracle).submitVerification(
                requestId,
                dataHash,
                dummyProof,
                dummyAttestation
            );

            // 4. Verify result is available
            const result = await consumerInterface.getResult(requestId);
            expect(result).to.equal(dataHash);
        });
    });

    describe("Error Cases", function () {
        it("Should fail with invalid payment", async function () {
            await expect(
                consumerInterface.connect(user).submitRequest(
                    "https://api.example.com/btc/price",
                    '{"currency": "USD"}',
                    "price_feed",
                    { value: 0 }
                )
            ).to.be.revertedWith("Insufficient payment");
        });

        it("Should fail with unregistered oracle", async function () {
            const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
            const dummyProof = ethers.randomBytes(32);
            const dummyAttestation = ethers.randomBytes(32);

            await expect(
                dataVerification.connect(user).submitVerification(
                    1, // requestId
                    dataHash,
                    dummyProof,
                    dummyAttestation
                )
            ).to.be.revertedWith("Not authorized oracle");
        });
    });
});
