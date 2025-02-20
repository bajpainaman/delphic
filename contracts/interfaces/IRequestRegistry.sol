// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRequestRegistry {
    enum RequestStatus {
        Pending,
        Processing,
        Completed,
        Failed
    }

    struct Request {
        uint256 requestId;
        address requester;
        bytes encryptedData;
        bytes requestMetadata;
        uint256 timestamp;
        RequestStatus status;
        address assignedOracle;
        bytes32 resultHash;
        uint256 fee;
    }

    function createRequest(
        bytes calldata _requestMetadata,
        bytes calldata _encryptedData
    ) external payable returns (uint256);

    function getRequestResult(uint256 _requestId) 
        external 
        view 
        returns (bytes32 resultHash, bool completed);
}