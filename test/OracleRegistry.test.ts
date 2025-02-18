import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("OracleRegistry", function () {
  let oracleRegistry: any;
  let owner: SignerWithAddress;
  let provider: SignerWithAddress;

  beforeEach(async function () {
    [owner, provider] = await ethers.getSigners();
    
    const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
    oracleRegistry = await OracleRegistry.deploy();
  });

  describe("Registration", function () {
    it("Should allow a provider to register", async function () {
      await oracleRegistry.connect(provider).registerProvider(
        "Test Provider",
        "JSON",
        3600 // 1 hour update frequency
      );

      const providerInfo = await oracleRegistry.getProvider(provider.address);
      expect(providerInfo.name).to.equal("Test Provider");
      expect(providerInfo.isActive).to.equal(true);
    });

    it("Should not allow double registration", async function () {
      await oracleRegistry.connect(provider).registerProvider(
        "Test Provider",
        "JSON",
        3600
      );

      await expect(
        oracleRegistry.connect(provider).registerProvider(
          "Test Provider 2",
          "JSON",
          3600
        )
      ).to.be.revertedWith("Provider already registered");
    });
  });

  describe("Data Submission", function () {
    it("Should allow registered provider to submit data", async function () {
      await oracleRegistry.connect(provider).registerProvider(
        "Test Provider",
        "JSON",
        3600
      );

      const dataHash = ethers.keccak256(ethers.toUtf8Bytes("test data"));
      await expect(oracleRegistry.connect(provider).submitDataHash(dataHash))
        .to.emit(oracleRegistry, "DataSubmitted")
        .withArgs(provider.address, dataHash);
    });
  });
});