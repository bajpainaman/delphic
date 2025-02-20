// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IOracleRegistry.sol";

contract OracleRegistry is IOracleRegistry, Ownable, Pausable, ReentrancyGuard {
    // Mapping from provider address to their information
    mapping(address => OracleProvider) private providers;

    // Array to keep track of all provider addresses
    address[] private providerAddresses;

    // Events
    event ProviderRegistered(
        address indexed provider,
        string name,
        string dataFormat,
        uint256 updateFrequency
    );
    event ProviderDeactivated(address indexed provider);
    event ProviderReactivated(address indexed provider);
    event DataSubmitted(address indexed provider, bytes32 dataHash);
    event TeeKeyRotated(address indexed provider, bytes newPublicKey);

    constructor() {}

    function getProvider(address _provider) 
        external 
        view 
        override 
        returns (OracleProvider memory) 
    {
        return providers[_provider];
    }

    function registerProvider(
        string memory _name,
        string memory _dataFormat,
        uint256 _updateFrequency,
        bytes memory _teePublicKey
    ) external override whenNotPaused {
        require(providers[msg.sender].providerAddress == address(0), "Provider already registered");
        
        providers[msg.sender] = OracleProvider({
            providerAddress: msg.sender,
            name: _name,
            dataFormat: _dataFormat,
            updateFrequency: _updateFrequency,
            isActive: true,
            reputation: 0,
            registrationTime: block.timestamp,
            teePublicKey: _teePublicKey,
            lastKeyRotation: block.timestamp
        });

        providerAddresses.push(msg.sender);
        
        emit ProviderRegistered(msg.sender, _name, _dataFormat, _updateFrequency);
    }

    function submitDataHash(bytes32 dataHash) external whenNotPaused {
        require(providers[msg.sender].isActive, "Provider not active");
        emit DataSubmitted(msg.sender, dataHash);
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

    function rotateTeeKey(bytes memory _newPublicKey) 
        external 
        override 
        whenNotPaused 
    {
        require(providers[msg.sender].isActive, "Provider not active");
        
        providers[msg.sender].teePublicKey = _newPublicKey;
        providers[msg.sender].lastKeyRotation = block.timestamp;
        
        emit TeeKeyRotated(msg.sender, _newPublicKey);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Additional helper functions
    function getProviderCount() external view returns (uint256) {
        return providerAddresses.length;
    }

    function getProviderAtIndex(uint256 _index) external view returns (address) {
        require(_index < providerAddresses.length, "Index out of bounds");
        return providerAddresses[_index];
    }
}