// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDataVerification {
    function isVerified(uint256 _requestId) external view returns (bool);
    
    function submitVerification(
        uint256 _requestId,
        bytes32 _dataHash,
        bytes calldata _proof,
        bytes calldata _teeAttestation
    ) external;
}

