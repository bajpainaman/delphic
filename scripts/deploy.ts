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
        
        const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
        console.log("Contract factory created");
        
        const oracleRegistry = await OracleRegistry.deploy();
        console.log("Deployment transaction sent");
        
        await oracleRegistry.waitForDeployment();
        const address = await oracleRegistry.getAddress();
        
        console.log("OracleRegistry deployed to:", address);
        console.log("Deployment complete!");
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