// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract OracleRegistry is Ownable, Pausable, ReentrancyGuard {
    // Struct to store Oracle Provider information
    struct OracleProvider {
        address providerAddress;
        string name;
        string dataFormat;
        uint256 updateFrequency;
        bool isActive;
        uint256 reputation;
        uint256 registrationTime;
    }

    // Mapping from provider address to their information
    mapping(address => OracleProvider) public providers;

    // Array to keep track of all provider addresses
    address[] public providerAddresses;

    // Events
    event ProviderRegistered(address indexed provider, string name, string dataFormat, uint256 updateFrequency);
    event ProviderDeactivated(address indexed provider);
    event ProviderReactivated(address indexed provider);
    event DataSubmitted(address indexed provider, bytes32 dataHash);

    constructor() {}

    function registerProvider(
        string memory _name,
        string memory _dataFormat,
        uint256 _updateFrequency
    ) external whenNotPaused {
        require(providers[msg.sender].providerAddress == address(0), "Provider already registered");
        
        providers[msg.sender] = OracleProvider({
            providerAddress: msg.sender,
            name: _name,
            dataFormat: _dataFormat,
            updateFrequency: _updateFrequency,
            isActive: true,
            reputation: 0,
            registrationTime: block.timestamp
        });

        providerAddresses.push(msg.sender);
        
        emit ProviderRegistered(msg.sender, _name, _dataFormat, _updateFrequency);
    }

    function submitDataHash(bytes32 dataHash) external whenNotPaused {
        require(providers[msg.sender].isActive, "Provider not active");
        emit DataSubmitted(msg.sender, dataHash);
    }

    function getProvider(address _provider) external view returns (
        string memory name,
        string memory dataFormat,
        uint256 updateFrequency,
        bool isActive,
        uint256 reputation
    ) {
        OracleProvider memory provider = providers[_provider];
        return (
            provider.name,
            provider.dataFormat,
            provider.updateFrequency,
            provider.isActive,
            provider.reputation
        );
    }

    function deactivateProvider(address _provider) external onlyOwner {
        require(providers[_provider].isActive, "Provider already inactive");
        providers[_provider].isActive = false;
        emit ProviderDeactivated(_provider);
    }

    function reactivateProvider(address _provider) external onlyOwner {
        require(!providers[_provider].isActive, "Provider already active");
        providers[_provider].isActive = true;
        emit ProviderReactivated(_provider);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}