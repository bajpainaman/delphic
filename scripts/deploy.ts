import { ethers } from "hardhat";

async function main() {
    try {
        console.log("Starting deployment...");
        
        // Get the network
        const network = await ethers.provider.getNetwork();
        console.log("Deploying to network:", network.name);
        
        // Get the signer
        const [deployer] = await ethers.getSigners();
        console.log("Deploying with account:", deployer.address);
        
        // Deploy OracleRegistry
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
        console.log("Deploying OracleRegistry...");
        const oracleRegistry = await OracleRegistry.deploy();
        await oracleRegistry.waitForDeployment();
        const oracleRegistryAddress = await oracleRegistry.getAddress();
        console.log("OracleRegistry deployed to:", oracleRegistryAddress);

        // Deploy PaymentHandler
        const PaymentHandler = await ethers.getContractFactory("PaymentHandler");
        console.log("Deploying PaymentHandler...");
        const paymentHandler = await PaymentHandler.deploy(
            ethers.parseEther("0.01"), // baseFee
            ethers.parseEther("0.001"), // complexityFee
            ethers.parseEther("0.02"), // priorityFee
            500 // protocolFee (5%)
        );
        await paymentHandler.waitForDeployment();
        const paymentHandlerAddress = await paymentHandler.getAddress();
        console.log("PaymentHandler deployed to:", paymentHandlerAddress);

        // Deploy DataVerification
        const DataVerification = await ethers.getContractFactory("DataVerification");
        console.log("Deploying DataVerification...");
        const dataVerification = await DataVerification.deploy();
        await dataVerification.waitForDeployment();
        const dataVerificationAddress = await dataVerification.getAddress();
        console.log("DataVerification deployed to:", dataVerificationAddress);

        // Deploy RequestRegistry
        const RequestRegistry = await ethers.getContractFactory("RequestRegistry");
        console.log("Deploying RequestRegistry...");
        const requestRegistry = await RequestRegistry.deploy();
        await requestRegistry.waitForDeployment();
        const requestRegistryAddress = await requestRegistry.getAddress();
        console.log("RequestRegistry deployed to:", requestRegistryAddress);

        // Deploy ConsumerInterface
        const ConsumerInterface = await ethers.getContractFactory("ConsumerInterface");
        console.log("Deploying ConsumerInterface...");
        const consumerInterface = await ConsumerInterface.deploy(
            requestRegistryAddress,
            dataVerificationAddress
        );
        await consumerInterface.waitForDeployment();
        const consumerInterfaceAddress = await consumerInterface.getAddress();
        console.log("ConsumerInterface deployed to:", consumerInterfaceAddress);

        // Log all addresses for easy reference
        console.log("\nDeployed Contracts:");
        console.log("-------------------");
        console.log("OracleRegistry:", oracleRegistryAddress);
        console.log("PaymentHandler:", paymentHandlerAddress);
        console.log("DataVerification:", dataVerificationAddress);
        console.log("RequestRegistry:", requestRegistryAddress);
        console.log("ConsumerInterface:", consumerInterfaceAddress);
        
        console.log("\nDeployment complete!");
        
        // Save addresses to a file for future reference
        const fs = require('fs');
        const addresses = {
            OracleRegistry: oracleRegistryAddress,
            PaymentHandler: paymentHandlerAddress,
            DataVerification: dataVerificationAddress,
            RequestRegistry: requestRegistryAddress,
            ConsumerInterface: consumerInterfaceAddress,
            network: network.name,
            chainId: Number(network.chainId)
        };
        
        fs.writeFileSync(
            'deployed-addresses.json',
            JSON.stringify(addresses, null, 2)
        );
        console.log("\nAddresses saved to deployed-addresses.json");

    } catch (error) {
        console.error("Deployment failed:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("ERROR:", error);
        process.exit(1);
    });