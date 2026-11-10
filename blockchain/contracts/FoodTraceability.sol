// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FoodTraceability
 * @dev Stores immutable SHA-256 hashes of food supply-chain journey events
 *      and verifies off-chain MongoDB records against on-chain hashes.
 */
contract FoodTraceability {
    struct EventRecord {
        string productId;
        string eventId;
        bytes32 eventHash;
        uint256 timestamp;
        address recordedBy;
        bool exists;
    }

    address public owner;
    uint256 public totalEventsRecorded;

    // Maps MongoDB JourneyEvent _id => on-chain EventRecord
    mapping(string => EventRecord) private eventRecords;

    // Maps Product productId => list of JourneyEvent _id strings
    mapping(string => string[]) private productEvents;

    event EventRecorded(
        string indexed productIdIndex,
        string productId,
        string eventId,
        bytes32 eventHash,
        uint256 timestamp,
        address recordedBy
    );

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Anchor a new journey event SHA-256 hash onto the blockchain.
     */
    function recordEvent(
        string memory _productId,
        string memory _eventId,
        bytes32 _eventHash
    ) public {
        require(bytes(_productId).length > 0, "Product ID is required");
        require(bytes(_eventId).length > 0, "Event ID is required");
        require(_eventHash != bytes32(0), "Event hash cannot be zero");
        require(
            !eventRecords[_eventId].exists,
            "Event already recorded on blockchain"
        );

        eventRecords[_eventId] = EventRecord({
            productId: _productId,
            eventId: _eventId,
            eventHash: _eventHash,
            timestamp: block.timestamp,
            recordedBy: msg.sender,
            exists: true
        });

        productEvents[_productId].push(_eventId);
        totalEventsRecorded += 1;

        emit EventRecorded(
            _productId,
            _productId,
            _eventId,
            _eventHash,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @dev Verify whether a recomputed SHA-256 hash matches the stored hash.
     */
    function verifyEvent(
        string memory _eventId,
        bytes32 _expectedHash
    )
        public
        view
        returns (
            bool exists,
            bool isMatch,
            bytes32 storedHash,
            uint256 timestamp,
            address recordedBy
        )
    {
        EventRecord memory record = eventRecords[_eventId];
        if (!record.exists) {
            return (false, false, bytes32(0), 0, address(0));
        }

        return (
            true,
            record.eventHash == _expectedHash,
            record.eventHash,
            record.timestamp,
            record.recordedBy
        );
    }

    /**
     * @dev Retrieve full on-chain metadata for a recorded event.
     */
    function getEventRecord(
        string memory _eventId
    )
        public
        view
        returns (
            string memory productId,
            bytes32 eventHash,
            uint256 timestamp,
            address recordedBy,
            bool exists
        )
    {
        EventRecord memory record = eventRecords[_eventId];
        return (
            record.productId,
            record.eventHash,
            record.timestamp,
            record.recordedBy,
            record.exists
        );
    }

    function getProductEventIds(
        string memory _productId
    ) public view returns (string[] memory) {
        return productEvents[_productId];
    }

    function getProductEventCount(
        string memory _productId
    ) public view returns (uint256) {
        return productEvents[_productId].length;
    }
}

