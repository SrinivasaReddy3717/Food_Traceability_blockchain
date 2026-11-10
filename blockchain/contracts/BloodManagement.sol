// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BloodManagement {
    // ----------------------------------------------------
    // ENUMS
    // ----------------------------------------------------

    enum BloodUnitStatus {
        REGISTERED,
        AVAILABLE,
        RESERVED,
        APPROVED,
        IN_TRANSIT,
        DELIVERED,
        EXPIRED,
        DISCARDED
    }

    // ----------------------------------------------------
    // STRUCTS
    // ----------------------------------------------------

    struct BloodUnit {
        string bloodUnitId;
        string bloodGroup;
        string donationId;
        string location;
        uint256 collectionDate;
        uint256 expiryDate;
        BloodUnitStatus status;
        string ipfsCid;
        address registeredBy;
        uint256 createdAt;
    }

    struct BloodRequest {
        string requestId;
        string hospitalId;
        string bloodGroup;
        uint256 quantity;
        string priority;
        BloodUnitStatus status;
        string[] bloodUnitIds;
        address requestedBy;
        uint256 createdAt;
    }

    // ----------------------------------------------------
    // STATE VARIABLES
    // ----------------------------------------------------

    address public admin;

    mapping(address => bool) public bloodBanks;
    mapping(address => bool) public hospitals;

    mapping(string => BloodUnit) private bloodUnits;
    mapping(string => BloodRequest) private bloodRequests;

    mapping(string => bool) public bloodUnitExists;
    mapping(string => bool) public bloodRequestExists;

    // ----------------------------------------------------
    // EVENTS
    // ----------------------------------------------------

    event BloodBankRegistered(
        address indexed bloodBank
    );

    event HospitalRegistered(
        address indexed hospital
    );

    event BloodUnitRegistered(
        string indexed bloodUnitId,
        string bloodGroup,
        string donationId,
        address indexed registeredBy
    );

    event BloodUnitStatusUpdated(
        string indexed bloodUnitId,
        BloodUnitStatus oldStatus,
        BloodUnitStatus newStatus,
        address indexed updatedBy
    );

    event BloodRequestCreated(
        string indexed requestId,
        string hospitalId,
        string bloodGroup,
        uint256 quantity,
        address indexed requestedBy
    );

    event BloodRequestApproved(
        string indexed requestId,
        address indexed approvedBy
    );

    event BloodRequestTransferred(
        string indexed requestId,
        address indexed transferredBy
    );

    event BloodRequestDelivered(
        string indexed requestId,
        address indexed deliveredBy
    );

    // ----------------------------------------------------
    // MODIFIERS
    // ----------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyBloodBank() {
        require(
            bloodBanks[msg.sender],
            "Only registered blood bank can perform this action"
        );
        _;
    }

    modifier onlyHospital() {
        require(
            hospitals[msg.sender],
            "Only registered hospital can perform this action"
        );
        _;
    }

    // ----------------------------------------------------
    // CONSTRUCTOR
    // ----------------------------------------------------

    constructor() {
        admin = msg.sender;
    }

    // ----------------------------------------------------
    // ROLE MANAGEMENT
    // ----------------------------------------------------

    function registerBloodBank(address bloodBank)
        external
        onlyAdmin
    {
        require(bloodBank != address(0), "Invalid blood bank address");

        bloodBanks[bloodBank] = true;

        emit BloodBankRegistered(bloodBank);
    }

    function registerHospital(address hospital)
        external
        onlyAdmin
    {
        require(hospital != address(0), "Invalid hospital address");

        hospitals[hospital] = true;

        emit HospitalRegistered(hospital);
    }

    // ----------------------------------------------------
    // BLOOD UNIT REGISTRATION
    // ----------------------------------------------------

    function registerBloodUnit(
        string calldata bloodUnitId,
        string calldata bloodGroup,
        string calldata donationId,
        string calldata location,
        uint256 collectionDate,
        uint256 expiryDate,
        string calldata ipfsCid
    )
        external
        onlyBloodBank
    {
        require(bytes(bloodUnitId).length > 0, "Blood unit ID required");
        require(!bloodUnitExists[bloodUnitId], "Blood unit already exists");
        require(bytes(bloodGroup).length > 0, "Blood group required");
        require(bytes(donationId).length > 0, "Donation ID required");
        require(expiryDate > collectionDate, "Invalid expiry date");

        bloodUnits[bloodUnitId] = BloodUnit({
            bloodUnitId: bloodUnitId,
            bloodGroup: bloodGroup,
            donationId: donationId,
            location: location,
            collectionDate: collectionDate,
            expiryDate: expiryDate,
            status: BloodUnitStatus.REGISTERED,
            ipfsCid: ipfsCid,
            registeredBy: msg.sender,
            createdAt: block.timestamp
        });

        bloodUnitExists[bloodUnitId] = true;

        emit BloodUnitRegistered(
            bloodUnitId,
            bloodGroup,
            donationId,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // BLOOD UNIT STATUS
    // ----------------------------------------------------

    function updateBloodUnitStatus(
        string calldata bloodUnitId,
        BloodUnitStatus newStatus
    )
        external
        onlyBloodBank
    {
        require(
            bloodUnitExists[bloodUnitId],
            "Blood unit does not exist"
        );

        BloodUnit storage unit = bloodUnits[bloodUnitId];

        BloodUnitStatus oldStatus = unit.status;

        unit.status = newStatus;

        emit BloodUnitStatusUpdated(
            bloodUnitId,
            oldStatus,
            newStatus,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // BLOOD REQUEST
    // ----------------------------------------------------

    function createBloodRequest(
        string calldata requestId,
        string calldata hospitalId,
        string calldata bloodGroup,
        uint256 quantity,
        string calldata priority
    )
        external
        onlyHospital
    {
        require(bytes(requestId).length > 0, "Request ID required");
        require(!bloodRequestExists[requestId], "Request already exists");
        require(bytes(hospitalId).length > 0, "Hospital ID required");
        require(bytes(bloodGroup).length > 0, "Blood group required");
        require(quantity > 0, "Quantity must be greater than zero");

        bloodRequests[requestId].requestId = requestId;
        bloodRequests[requestId].hospitalId = hospitalId;
        bloodRequests[requestId].bloodGroup = bloodGroup;
        bloodRequests[requestId].quantity = quantity;
        bloodRequests[requestId].priority = priority;
        bloodRequests[requestId].status = BloodUnitStatus.REGISTERED;
        bloodRequests[requestId].requestedBy = msg.sender;
        bloodRequests[requestId].createdAt = block.timestamp;

        bloodRequestExists[requestId] = true;

        emit BloodRequestCreated(
            requestId,
            hospitalId,
            bloodGroup,
            quantity,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // APPROVE REQUEST
    // ----------------------------------------------------

    function approveBloodRequest(
        string calldata requestId,
        string[] calldata bloodUnitIds
    )
        external
        onlyBloodBank
    {
        require(
            bloodRequestExists[requestId],
            "Blood request does not exist"
        );

        BloodRequest storage request = bloodRequests[requestId];

        require(
            request.status == BloodUnitStatus.REGISTERED,
            "Request is not pending"
        );

        require(
            bloodUnitIds.length == request.quantity,
            "Incorrect number of blood units"
        );

        for (uint256 i = 0; i < bloodUnitIds.length; i++) {
            require(
                bloodUnitExists[bloodUnitIds[i]],
                "Blood unit does not exist"
            );

            BloodUnit storage unit = bloodUnits[bloodUnitIds[i]];

            require(
                unit.status == BloodUnitStatus.AVAILABLE,
                "Blood unit is not available"
            );

            require(
                keccak256(bytes(unit.bloodGroup)) ==
                    keccak256(bytes(request.bloodGroup)),
                "Blood group mismatch"
            );

            unit.status = BloodUnitStatus.RESERVED;

            request.bloodUnitIds.push(bloodUnitIds[i]);
        }

        request.status = BloodUnitStatus.APPROVED;

        emit BloodRequestApproved(
            requestId,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // TRANSFER
    // ----------------------------------------------------

    function transferBloodRequest(
        string calldata requestId
    )
        external
        onlyBloodBank
    {
        require(
            bloodRequestExists[requestId],
            "Blood request does not exist"
        );

        BloodRequest storage request = bloodRequests[requestId];

        require(
            request.status == BloodUnitStatus.APPROVED,
            "Request is not approved"
        );

        for (uint256 i = 0; i < request.bloodUnitIds.length; i++) {
            BloodUnit storage unit =
                bloodUnits[request.bloodUnitIds[i]];

            require(
                unit.status == BloodUnitStatus.RESERVED,
                "Blood unit is not reserved"
            );

            unit.status = BloodUnitStatus.IN_TRANSIT;
        }

        request.status = BloodUnitStatus.IN_TRANSIT;

        emit BloodRequestTransferred(
            requestId,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // DELIVERY
    // ----------------------------------------------------

    function deliverBloodRequest(
        string calldata requestId
    )
        external
        onlyHospital
    {
        require(
            bloodRequestExists[requestId],
            "Blood request does not exist"
        );

        BloodRequest storage request = bloodRequests[requestId];

        require(
            request.status == BloodUnitStatus.IN_TRANSIT,
            "Request is not in transit"
        );

        for (uint256 i = 0; i < request.bloodUnitIds.length; i++) {
            BloodUnit storage unit =
                bloodUnits[request.bloodUnitIds[i]];

            require(
                unit.status == BloodUnitStatus.IN_TRANSIT,
                "Blood unit is not in transit"
            );

            unit.status = BloodUnitStatus.DELIVERED;
        }

        request.status = BloodUnitStatus.DELIVERED;

        emit BloodRequestDelivered(
            requestId,
            msg.sender
        );
    }

    // ----------------------------------------------------
    // VIEW FUNCTIONS
    // ----------------------------------------------------

    function getBloodUnit(
        string calldata bloodUnitId
    )
        external
        view
        returns (BloodUnit memory)
    {
        require(
            bloodUnitExists[bloodUnitId],
            "Blood unit does not exist"
        );

        return bloodUnits[bloodUnitId];
    }

    function getBloodRequest(
        string calldata requestId
    )
        external
        view
        returns (BloodRequest memory)
    {
        require(
            bloodRequestExists[requestId],
            "Blood request does not exist"
        );

        return bloodRequests[requestId];
    }

    function getAdmin()
        external
        view
        returns (address)
    {
        return admin;
    }
}