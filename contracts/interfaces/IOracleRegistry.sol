// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IOracleRegistry {
    struct OracleProvider {
        address providerAddress;
        string name;
        string dataFormat;
        uint256 updateFrequency;
        bool isActive;
        uint256 reputation;
        uint256 registrationTime;
        bytes teePublicKey;
        uint256 lastKeyRotation;
    }

    function getProvider(address _provider) external view returns (OracleProvider memory);
    
    function registerProvider(
        string memory _name,
        string memory _dataFormat,
        uint256 _updateFrequency,
        bytes memory _teePublicKey
    ) external;

    function rotateTeeKey(bytes memory _newPublicKey) external;
}