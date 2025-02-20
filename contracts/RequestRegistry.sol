// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title RequestRegistry
 * @dev Manages API requests and tracks their lifecycle with paymaster integration
 * This contract handles the registration and tracking of data requests from users
 */
contract RequestRegistry is Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Counter for unique request IDs
    Counters.Counter private _requestIds;

    // Request status enum
    enum RequestStatus {
        Pending,    // Initial state when request is created
        Processing, // Oracle has picked up the request
        Completed,  // Request has been fulfilled
        Failed      // Request failed to process
    }

    // Structure to store request details
    struct Request {
        uint256 requestId;
        address requester;
        bytes encryptedData;    // Changed from string apiEndpoint
        bytes requestMetadata;  // Changed from string parameters
        uint256 timestamp;
        RequestStatus status;
        address assignedOracle;
        bytes32 resultHash;
        uint256 fee;
    }

    // Mapping from requestId to Request
    mapping(uint256 => Request) public requests;
    
    // Mapping from user address to their request IDs
    mapping(address => uint256[]) public userRequests;

    // Events
    event RequestCreated(
        uint256 indexed requestId,
        address indexed requester,
        uint256 fee
    );
    event RequestAssigned(uint256 indexed requestId, address indexed oracle);
    event RequestCompleted(uint256 indexed requestId, bytes32 resultHash);
    event RequestFailed(uint256 indexed requestId, string reason);

    /**
     * @dev Creates a new API request
     * @param _requestMetadata The metadata for the API call in JSON format
     * @param _encryptedData The encrypted data for the API call
     */
    function createRequest(
        bytes calldata _requestMetadata,
        bytes calldata _encryptedData
    ) external payable whenNotPaused nonReentrant returns (uint256) {
        _requestIds.increment();
        uint256 newRequestId = _requestIds.current();

        Request storage newRequest = requests[newRequestId];
        newRequest.requestId = newRequestId;
        newRequest.requester = msg.sender;
        newRequest.encryptedData = _encryptedData;
        newRequest.requestMetadata = _requestMetadata;
        newRequest.timestamp = block.timestamp;
        newRequest.status = RequestStatus.Pending;
        newRequest.fee = msg.value;

        userRequests[msg.sender].push(newRequestId);

        emit RequestCreated(newRequestId, msg.sender, msg.value);
        return newRequestId;
    }

    /**
     * @dev Assigns an oracle to a request
     * @param _requestId The ID of the request to assign
     * @param _oracle The address of the oracle to assign
     */
    function assignOracle(uint256 _requestId, address _oracle) 
        external 
        onlyOwner 
        whenNotPaused 
    {
        require(requests[_requestId].status == RequestStatus.Pending, "Request not pending");
        requests[_requestId].assignedOracle = _oracle;
        requests[_requestId].status = RequestStatus.Processing;
        
        emit RequestAssigned(_requestId, _oracle);
    }

    /**
     * @dev Completes a request with the result
     * @param _requestId The ID of the request to complete
     * @param _resultHash The hash of the result data
     */
    function completeRequest(uint256 _requestId, bytes32 _resultHash) 
        external 
        whenNotPaused 
    {
        Request storage request = requests[_requestId];
        require(request.assignedOracle == msg.sender, "Not assigned oracle");
        require(request.status == RequestStatus.Processing, "Invalid request status");

        request.status = RequestStatus.Completed;
        request.resultHash = _resultHash;

        emit RequestCompleted(_requestId, _resultHash);
    }

    /**
     * @dev Marks a request as failed
     * @param _requestId The ID of the failed request
     * @param _reason The reason for failure
     */
    function failRequest(uint256 _requestId, string calldata _reason) 
        external 
        whenNotPaused 
    {
        Request storage request = requests[_requestId];
        require(request.assignedOracle == msg.sender, "Not assigned oracle");
        require(request.status == RequestStatus.Processing, "Invalid request status");

        request.status = RequestStatus.Failed;
        
        emit RequestFailed(_requestId, _reason);
    }

    /**
     * @dev Gets all requests for a user
     * @param _user The address of the user
     * @return uint256[] Array of request IDs
     */
    function getUserRequests(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userRequests[_user];
    }

    /**
     * @dev Gets request details
     * @param _requestId The ID of the request
     * @return Request struct containing request details
     */
    function getRequest(uint256 _requestId) 
        external 
        view 
        returns (Request memory) 
    {
        return requests[_requestId];
    }

    /**
     * @dev Gets request result
     * @param _requestId The ID of the request
     * @return resultHash The hash of the result
     * @return completed Whether the request is completed
     */
    function getRequestResult(uint256 _requestId) 
        external 
        view 
        returns (bytes32 resultHash, bool completed) 
    {
        Request storage request = requests[_requestId];
        return (
            request.resultHash,
            request.status == RequestStatus.Completed
        );
    }
}