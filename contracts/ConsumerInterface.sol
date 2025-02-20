// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IRequestRegistry.sol";
import "./interfaces/IDataVerification.sol";

/**
 * @title ConsumerInterface
 * @dev Provides a user-friendly interface for consumers to interact with the oracle system
 */
contract ConsumerInterface is Ownable, Pausable, ReentrancyGuard {
    // Contract references
    IRequestRegistry public requestRegistry;
    IDataVerification public dataVerification;

    // Struct to store consumer request details
    struct ConsumerRequest {
        uint256 requestId;
        address consumer;
        string dataType;
        uint256 timestamp;
        bool isCompleted;
        bytes32 result;
        bytes encryptedData;    // Added for TEE
        bytes requestMetadata;  // Added for TEE
    }

    // Mapping to store consumer requests
    mapping(address => ConsumerRequest[]) public consumerRequests;
    
    // Events
    event RequestSubmitted(
        address indexed consumer,
        uint256 indexed requestId,
        string dataType
    );
    event ResultReceived(
        uint256 indexed requestId,
        bytes32 result
    );
    event Debug(string message, uint256 value);

    constructor(
        address _requestRegistry,
        address _dataVerification
    ) {
        requestRegistry = IRequestRegistry(_requestRegistry);
        dataVerification = IDataVerification(_dataVerification);
    }

    /**
     * @dev Submits a new data request
     * @param _requestMetadata The metadata for the request
     * @param _encryptedData The encrypted data for the request
     * @param _dataType The type of data being requested
     */
    function submitRequest(
        bytes calldata _requestMetadata,
        bytes calldata _encryptedData,
        string calldata _dataType
    ) external payable returns (uint256) {
        // Add debug events at each step
        emit Debug("Step 1: Request received", msg.value);
        emit Debug("Metadata length", _requestMetadata.length);
        emit Debug("Encrypted data length", _encryptedData.length);
        
        require(msg.value > 0, "Payment required");
        emit Debug("Step 2: Payment verified", 0);
        
        require(bytes(_dataType).length > 0, "Data type required");
        require(_requestMetadata.length > 0, "Metadata required");
        require(_encryptedData.length > 0, "Encrypted data required");
        emit Debug("Step 3: Parameters verified", 0);
        
        try requestRegistry.createRequest{value: msg.value}(
            _requestMetadata,
            _encryptedData
        ) returns (uint256 requestId) {
            emit Debug("Step 4: Registry call successful", requestId);
            // Store request details
            consumerRequests[msg.sender].push(ConsumerRequest({
                requestId: requestId,
                consumer: msg.sender,
                dataType: _dataType,
                timestamp: block.timestamp,
                isCompleted: false,
                result: bytes32(0),
                encryptedData: _encryptedData,
                requestMetadata: _requestMetadata
            }));

            emit RequestSubmitted(msg.sender, requestId, _dataType);
            return requestId;
        } catch Error(string memory reason) {
            emit Debug("Step 5: Registry call failed with reason", 0);
            revert(string.concat("Registry error: ", reason));
        } catch {
            emit Debug("Step 6: Registry call failed without reason", 0);
            revert("Failed to create request in registry");
        }
    }

    /**
     * @dev Retrieves the result for a specific request
     * @param _requestId The ID of the request
     * @return bytes32 The result data hash
     */
    function getResult(uint256 _requestId) 
        external 
        view 
        returns (bytes32) 
    {
        require(
            dataVerification.isVerified(_requestId),
            "Data not verified"
        );
        
        // Get request details from RequestRegistry
        (bytes32 resultHash, ) = requestRegistry.getRequestResult(_requestId);
        return resultHash;
    }

    /**
     * @dev Gets all requests for a consumer
     * @param _consumer The address of the consumer
     * @return ConsumerRequest[] Array of consumer requests
     */
    function getConsumerRequests(address _consumer)
        external
        view
        returns (ConsumerRequest[] memory)
    {
        return consumerRequests[_consumer];
    }
}