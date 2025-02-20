// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PaymentHandler
 * @dev Manages payments and fee distribution with paymaster integration
 * This contract handles all payment-related functionality including fee collection and distribution
 */
contract PaymentHandler is Ownable, Pausable, ReentrancyGuard {
    // Fee configuration
    struct FeeConfig {
        uint256 baseFee;          // Base fee for requests
        uint256 complexityFee;    // Additional fee based on request complexity
        uint256 priorityFee;      // Fee for priority processing
        uint256 protocolFee;      // Percentage of fees that go to protocol (in basis points)
    }

    // Payment recipient details
    struct PaymentRecipient {
        address payable recipientAddress;
        uint256 sharePercentage;  // In basis points (100 = 1%)
        uint256 pendingPayment;
    }

    // State variables
    FeeConfig public feeConfig;
    mapping(address => PaymentRecipient) public paymentRecipients;
    address[] public recipientList;

    // Events
    event FeeConfigUpdated(
        uint256 baseFee,
        uint256 complexityFee,
        uint256 priorityFee,
        uint256 protocolFee
    );
    event PaymentProcessed(
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );
    event PaymentDistributed(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    constructor(
        uint256 _baseFee,
        uint256 _complexityFee,
        uint256 _priorityFee,
        uint256 _protocolFee
    ) {
        feeConfig = FeeConfig({
            baseFee: _baseFee,
            complexityFee: _complexityFee,
            priorityFee: _priorityFee,
            protocolFee: _protocolFee
        });
    }

    /**
     * @dev Calculates the total fee for a request
     * @param _complexity Complexity level of the request
     * @param _priority Whether priority processing is requested
     * @return uint256 Total fee amount
     */
    function calculateFee(uint256 _complexity, bool _priority) 
        public 
        view 
        returns (uint256) 
    {
        uint256 totalFee = feeConfig.baseFee;
        totalFee += _complexity * feeConfig.complexityFee;
        if (_priority) {
            totalFee += feeConfig.priorityFee;
        }
        return totalFee;
    }

    /**
     * @dev Processes a payment for a request
     * @param _complexity Complexity level of the request
     * @param _priority Whether priority processing is requested
     */
    function processPayment(uint256 _complexity, bool _priority) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        uint256 requiredFee = calculateFee(_complexity, _priority);
        require(msg.value >= requiredFee, "Insufficient payment");

        // Distribute the payment
        uint256 protocolShare = (msg.value * feeConfig.protocolFee) / 10000;
        uint256 remainingAmount = msg.value - protocolShare;

        // Add to pending payments
        paymentRecipients[owner()].pendingPayment += protocolShare;
        
        // Distribute remaining amount among recipients
        for (uint256 i = 0; i < recipientList.length; i++) {
            address recipient = recipientList[i];
            uint256 share = (remainingAmount * paymentRecipients[recipient].sharePercentage) / 10000;
            paymentRecipients[recipient].pendingPayment += share;
        }

        emit PaymentProcessed(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Withdraws pending payments for a recipient
     */
    function withdrawPayment() external nonReentrant {
        PaymentRecipient storage recipient = paymentRecipients[msg.sender];
        require(recipient.pendingPayment > 0, "No pending payment");

        uint256 amount = recipient.pendingPayment;
        recipient.pendingPayment = 0;

        (bool success, ) = recipient.recipientAddress.call{value: amount}("");
        require(success, "Transfer failed");

        emit PaymentDistributed(msg.sender, amount, block.timestamp);
    }

    // Admin functions for managing fee configuration and recipients...
    // (Additional functions for updating fees, adding/removing recipients, etc.)
}